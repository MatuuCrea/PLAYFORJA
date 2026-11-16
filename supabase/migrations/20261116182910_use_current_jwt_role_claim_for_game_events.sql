CREATE OR REPLACE FUNCTION public.record_verified_game_event(p_user_id uuid, p_event_type text, p_amount integer, p_external_event_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_event uuid; v_updates integer := 0;
begin
 if (auth.jwt() ->> 'role') is distinct from 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 if p_event_type not in ('win','elimination','team_minute','room_game','tournament_join','night_game','tournament_top3','rank_up') then raise exception 'INVALID_EVENT_TYPE'; end if;
 if p_amount is null or p_amount < 1 or p_amount > 10000 then raise exception 'INVALID_EVENT_AMOUNT'; end if;
 insert into public.verified_game_events(external_event_id,user_id,event_type,amount)
 values(p_external_event_id,p_user_id,p_event_type,p_amount)
 on conflict(external_event_id) do nothing returning id into v_event;
 if v_event is null then return jsonb_build_object('accepted',true,'duplicate',true,'updated_missions',0); end if;
 update public.user_missions um set
   progress=least(m.target,um.progress + p_amount),
   completed_at=case when um.progress+p_amount>=m.target then coalesce(um.completed_at,now()) else um.completed_at end
 from public.missions m
 where um.mission_id=m.id and um.user_id=p_user_id and um.started_at is not null and um.claimed_at is null
 and ((m.category='daily' and um.period_key=to_char(now() at time zone 'UTC','YYYY-MM-DD'))
   or (m.category='weekly' and um.period_key=to_char(now() at time zone 'UTC','IYYY-IW'))
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
 );
 get diagnostics v_updates = row_count;
 return jsonb_build_object('accepted',true,'duplicate',false,'updated_missions',v_updates);
end;
$function$;
