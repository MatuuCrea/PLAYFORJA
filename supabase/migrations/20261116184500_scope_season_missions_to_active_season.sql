CREATE OR REPLACE FUNCTION public.get_my_missions()
RETURNS TABLE(user_mission_id uuid,mission_id uuid,slug text,title text,description text,category text,difficulty text,target integer,progress integer,reward_xp integer,reward_pf integer,started_at timestamptz,completed_at timestamptz,claimed_at timestamptz,period_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_day text;v_week text;v_season text;v_season_id uuid;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED';end if;
 v_day:=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD');
 v_week:=to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW');
 select id,id::text into v_season_id,v_season from public.seasons
 where status='active' and starts_at<=now() and ends_at>now()
 order by starts_at desc limit 1;
 v_season:=coalesce(v_season,'season-preview');
 insert into public.user_missions(user_id,mission_id,period_key)
 select v_user,m.id,case when m.category='daily' then v_day when m.category='weekly' then v_week else v_season end
 from public.missions m where m.active=true and (m.category<>'seasonal' or m.season_id is null or m.season_id=v_season_id)
 on conflict(user_id,mission_id,period_key) do nothing;
 return query
 select um.id,m.id,m.slug,m.title,m.description,m.category,m.difficulty,m.target,um.progress,m.reward_xp,m.reward_pf,um.started_at,um.completed_at,um.claimed_at,um.period_key
 from public.user_missions um join public.missions m on m.id=um.mission_id
 where um.user_id=v_user and m.active=true
 and ((m.category='daily' and um.period_key=v_day) or (m.category='weekly' and um.period_key=v_week)
   or (m.category='seasonal' and um.period_key=v_season and (m.season_id is null or m.season_id=v_season_id)))
 order by case m.category when 'daily' then 1 when 'weekly' then 2 else 3 end,m.difficulty,m.title;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_mission(p_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_category text;v_period text;v_row public.user_missions%rowtype;v_season_id uuid;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED';end if;
 select category into v_category from public.missions where id=p_mission_id and active=true;
 if not found then raise exception 'MISSION_NOT_AVAILABLE';end if;
 if v_category='daily' then v_period=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD');
 elsif v_category='weekly' then v_period=to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW');
 else
   select id into v_season_id from public.seasons where status='active' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
   v_period=coalesce(v_season_id::text,'season-preview');
 end if;
 insert into public.user_missions(user_id,mission_id,period_key,started_at)
 values(v_user,p_mission_id,v_period,now())
 on conflict(user_id,mission_id,period_key) do update set started_at=coalesce(public.user_missions.started_at,now())
 returning * into v_row;
 return jsonb_build_object('user_mission_id',v_row.id,'progress',v_row.progress,'started_at',v_row.started_at,'claimed',v_row.claimed_at is not null);
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_verified_game_event(p_user_id uuid,p_event_type text,p_amount integer,p_external_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_event uuid;v_updates integer:=0;v_season text;v_season_id uuid;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED';end if;
 if p_event_type not in ('win','elimination','team_minute','room_game','tournament_join','night_game','tournament_top3','rank_up','match_complete','friend_invite','win_no_deaths') then raise exception 'INVALID_EVENT_TYPE';end if;
 if p_amount is null or p_amount<1 or p_amount>10000 then raise exception 'INVALID_EVENT_AMOUNT';end if;
 if p_external_event_id is null or length(p_external_event_id)<8 or length(p_external_event_id)>200 then raise exception 'INVALID_EVENT_ID';end if;
 select id,id::text into v_season_id,v_season from public.seasons where status='active' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
 v_season:=coalesce(v_season,'season-preview');
 insert into public.verified_game_events(external_event_id,user_id,event_type,amount) values(p_external_event_id,p_user_id,p_event_type,p_amount)
 on conflict(external_event_id) do nothing returning id into v_event;
 if v_event is null then return jsonb_build_object('accepted',true,'duplicate',true,'updated_missions',0);end if;
 update public.user_missions um set progress=least(m.target,um.progress+p_amount),
 completed_at=case when um.progress+p_amount>=m.target then coalesce(um.completed_at,now()) else um.completed_at end
 from public.missions m
 where um.mission_id=m.id and um.user_id=p_user_id and um.started_at is not null and um.claimed_at is null
 and ((m.category='daily' and um.period_key=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD'))
  or (m.category='weekly' and um.period_key=to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW'))
  or (m.category='seasonal' and um.period_key=v_season and (m.season_id is null or m.season_id=v_season_id)))
 and ((p_event_type='win' and m.slug in ('daily-win-3','weekly-win-10','season-forja'))
  or (p_event_type='elimination' and m.slug in ('daily-elims-15','weekly-elims-50'))
  or (p_event_type='team_minute' and m.slug='daily-team-30')
  or (p_event_type='room_game' and m.slug='daily-room-5')
  or (p_event_type='tournament_join' and m.slug='daily-tournament-join')
  or (p_event_type='night_game' and m.slug='daily-night-2')
  or (p_event_type='tournament_top3' and m.slug in ('daily-top3','season-antipro'))
  or (p_event_type='rank_up' and m.slug in ('weekly-rank-up','season-llama'))
  or (p_event_type='match_complete' and m.slug='daily-games-5')
  or (p_event_type='friend_invite' and m.slug='daily-invite-friend')
  or (p_event_type='win_no_deaths' and m.slug='daily-win-no-deaths'));
 get diagnostics v_updates=row_count;
 return jsonb_build_object('accepted',true,'duplicate',false,'updated_missions',v_updates);
end;
$function$;
