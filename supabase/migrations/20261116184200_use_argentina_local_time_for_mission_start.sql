CREATE OR REPLACE FUNCTION public.start_mission(p_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_category text;v_period text;v_row public.user_missions%rowtype;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select category into v_category from public.missions where id=p_mission_id and active=true;
 if not found then raise exception 'MISSION_NOT_AVAILABLE'; end if;
 if v_category='daily' then v_period=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD');
 elsif v_category='weekly' then v_period=to_char(now() at time zone 'America/Argentina/Buenos_Aires','IYYY-IW');
 else v_period='season'; end if;
 insert into public.user_missions(user_id,mission_id,period_key,started_at)
 values(v_user,p_mission_id,v_period,now())
 on conflict(user_id,mission_id,period_key) do update set started_at=coalesce(public.user_missions.started_at,now())
 returning * into v_row;
 return jsonb_build_object('user_mission_id',v_row.id,'progress',v_row.progress,'started_at',v_row.started_at,'claimed',v_row.claimed_at is not null);
end;
$function$;