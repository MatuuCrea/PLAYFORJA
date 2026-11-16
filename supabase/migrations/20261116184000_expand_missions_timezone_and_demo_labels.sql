ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE public.tournaments SET is_demo = true WHERE slug NOT LIKE 'user-%';
UPDATE public.rooms SET is_demo = true;

INSERT INTO public.missions(slug,title,description,category,difficulty,target,reward_xp,reward_pf,active)
VALUES
('daily-win-no-deaths','Ganà una partida sin morir','Conseguí una victoria verificada sin registrar muertes.','daily','Difícil',1,350,120,true),
('daily-invite-friend','Invitá a un amigo a una sala','Invitá a un amigo y completá la incorporación a una sala.','daily','Medio',1,180,60,true)
ON CONFLICT (slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,difficulty=excluded.difficulty,target=excluded.target,reward_xp=excluded.reward_xp,reward_pf=excluded.reward_pf,active=true;

CREATE OR REPLACE FUNCTION public.get_my_missions()
RETURNS TABLE(user_mission_id uuid, mission_id uuid, slug text, title text, description text, category text, difficulty text, target integer, progress integer, reward_xp integer, reward_pf integer, started_at timestamptz, completed_at timestamptz, claimed_at timestamptz, period_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid := auth.uid(); v_day text; v_week text;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 v_day := to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD');
 v_week := to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW');
 insert into public.user_missions(user_id,mission_id,period_key)
 select v_user,m.id,case when m.category='daily' then v_day when m.category='weekly' then v_week else 'season' end
 from public.missions m where m.active=true
 on conflict(user_id,mission_id,period_key) do nothing;
 return query
 select um.id,m.id,m.slug,m.title,m.description,m.category,m.difficulty,m.target,um.progress,m.reward_xp,m.reward_pf,um.started_at,um.completed_at,um.claimed_at,um.period_key
 from public.user_missions um join public.missions m on m.id=um.mission_id
 where um.user_id=v_user and m.active=true
 and ((m.category='daily' and um.period_key=v_day) or (m.category='weekly' and um.period_key=v_week) or m.category='seasonal')
 order by case m.category when 'daily' then 1 when 'weekly' then 2 else 3 end,m.difficulty,m.title;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_verified_game_event(p_user_id uuid,p_event_type text,p_amount integer,p_external_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_event uuid; v_updates integer := 0;
begin
 if (auth.jwt() ->> 'role') is distinct from 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 if p_event_type not in ('win','elimination','team_minute','room_game','tournament_join','night_game','tournament_top3','rank_up','match_complete','friend_invite','win_no_deaths') then raise exception 'INVALID_EVENT_TYPE'; end if;
 if p_amount is null or p_amount < 1 or p_amount > 10000 then raise exception 'INVALID_EVENT_AMOUNT'; end if;
 if p_external_event_id is null or length(p_external_event_id)<8 or length(p_external_event_id)>200 then raise exception 'INVALID_EVENT_ID'; end if;
 insert into public.verified_game_events(external_event_id,user_id,event_type,amount)
 values(p_external_event_id,p_user_id,p_event_type,p_amount)
 on conflict(external_event_id) do nothing returning id into v_event;
 if v_event is null then return jsonb_build_object('accepted',true,'duplicate',true,'updated_missions',0); end if;
 update public.user_missions um set
   progress=least(m.target,um.progress+p_amount),
   completed_at=case when um.progress+p_amount>=m.target then coalesce(um.completed_at,now()) else um.completed_at end
 from public.missions m
 where um.mission_id=m.id and um.user_id=p_user_id and um.started_at is not null and um.claimed_at is null
 and ((m.category='daily' and um.period_key=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD'))
   or (m.category='weekly' and um.period_key=to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW'))
   or m.category='seasonal')
 and (
   (p_event_type='win' and m.slug in ('daily-win-3','weekly-win-10','season-forja'))
   or (p_event_type='elimination' and m.slug in ('daily-elims-15','weekly-elims-50'))
   or (p_event_type='team_minute' and m.slug='daily-team-30')
   or (p_event_type='room_game' and m.slug='daily-room-5')
   or (p_event_type='tournament_join' and m.slug='daily-tournament-join')
   or (p_event_type='night_game' and m.slug='daily-night-2')
   or (p_event_type='tournament_top3' and m.slug in ('daily-top3','season-antipro'))
   or (p_event_type='rank_up' and m.slug in ('weekly-rank-up','season-llama'))
   or (p_event_type='match_complete' and m.slug='daily-games-5')
   or (p_event_type='friend_invite' and m.slug='daily-invite-friend')
   or (p_event_type='win_no_deaths' and m.slug='daily-win-no-deaths')
 );
 get diagnostics v_updates = row_count;
 return jsonb_build_object('accepted',true,'duplicate',false,'updated_missions',v_updates);
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_mission(p_user_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid := auth.uid(); v_row public.user_missions%rowtype; v_mission public.missions%rowtype;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_row from public.user_missions where id=p_user_mission_id and user_id=v_user for update;
 if not found then raise exception 'MISSION_NOT_FOUND'; end if;
 if v_row.claimed_at is not null then raise exception 'MISSION_ALREADY_CLAIMED'; end if;
 select * into v_mission from public.missions where id=v_row.mission_id and active=true;
 if not found then raise exception 'MISSION_NOT_AVAILABLE'; end if;
 if v_row.progress < v_mission.target then raise exception 'MISSION_INCOMPLETE'; end if;
 update public.user_missions set claimed_at=now(),completed_at=coalesce(completed_at,now()) where id=p_user_mission_id;
 update public.profiles set xp=xp+v_mission.reward_xp,pf_balance=pf_balance+v_mission.reward_pf,updated_at=now() where id=v_user;
 if v_mission.reward_pf>0 then insert into public.wallet_transactions(user_id,amount_pf,reason,reference_id) values(v_user,v_mission.reward_pf,'mission_reward',p_user_mission_id); end if;
 if v_mission.category='daily' then
   update public.user_missions um set progress=least(m.target,um.progress+1),
     completed_at=case when um.progress+1>=m.target then coalesce(um.completed_at,now()) else um.completed_at end
   from public.missions m
   where um.mission_id=m.id and um.user_id=v_user and m.slug='weekly-daily-5'
     and um.period_key=to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW')
     and um.started_at is not null and um.claimed_at is null;
 end if;
 return jsonb_build_object('claimed',true,'reward_xp',v_mission.reward_xp,'reward_pf',v_mission.reward_pf);
end;
$function$;

CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); v_capacity integer; v_count integer; v_status text;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select capacity,status into v_capacity,v_status from public.tournaments where id=p_tournament_id for update;
 if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
 if v_status<>'open' then raise exception 'TOURNAMENT_CLOSED'; end if;
 if exists(select 1 from public.tournament_registrations where tournament_id=p_tournament_id and user_id=v_user) then return jsonb_build_object('joined',true,'already_joined',true); end if;
 select count(*) into v_count from public.tournament_registrations where tournament_id=p_tournament_id;
 if v_count>=v_capacity then raise exception 'TOURNAMENT_FULL'; end if;
 insert into public.tournament_registrations(tournament_id,user_id) values(p_tournament_id,v_user);
 if v_count+1>=v_capacity then update public.tournaments set status='full' where id=p_tournament_id; end if;
 update public.user_missions um set progress=least(m.target,um.progress+1),
   completed_at=case when um.progress+1>=m.target then coalesce(um.completed_at,now()) else um.completed_at end
 from public.missions m
 where um.mission_id=m.id and um.user_id=v_user and m.slug='daily-tournament-join'
   and um.period_key=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD')
   and um.started_at is not null and um.claimed_at is null;
 return jsonb_build_object('joined',true,'already_joined',false,'registered',v_count+1,'capacity',v_capacity);
end;
$function$;
