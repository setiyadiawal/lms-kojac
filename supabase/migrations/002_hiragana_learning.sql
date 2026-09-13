-- KOJAC LMS v2 - Milestone 2A: Hiragana
-- Jalankan setelah 001_kojac_lms_foundation.sql.

alter table public.review_progress
  add column if not exists correct_count integer not null default 0 check (correct_count >= 0),
  add column if not exists wrong_count integer not null default 0 check (wrong_count >= 0),
  add column if not exists mastery_score integer not null default 0 check (mastery_score between 0 and 100);

-- Progres review hanya boleh ditulis melalui RPC atomik.
revoke insert, update, delete on public.review_progress from authenticated;
grant select on public.review_progress to authenticated;

create or replace function public.record_hiragana_review(
  p_item_id uuid,
  p_rating smallint
)
returns table(
  item_id uuid,
  repetitions integer,
  interval_days integer,
  ease_factor numeric,
  due_at timestamptz,
  last_rating smallint,
  last_reviewed_at timestamptz,
  correct_count integer,
  wrong_count integer,
  mastery_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.review_progress%rowtype;
  v_new_repetitions integer;
  v_new_interval integer;
  v_new_ease numeric(4,2);
  v_new_mastery integer;
  v_new_due timestamptz;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_rating is null or p_rating < 0 or p_rating > 3 then raise exception 'rating must be between 0 and 3'; end if;

  if not exists (
    select 1 from public.learning_items
    where id = p_item_id and item_type = 'hiragana' and is_published = true
  ) then raise exception 'hiragana item not found'; end if;

  select * into v_row
  from public.review_progress
  where user_id = v_user and item_id = p_item_id
  for update;

  if not found then
    v_new_repetitions := case when p_rating = 0 then 0 else 1 end;
    v_new_ease := greatest(1.30, least(3.50, 2.50 + case p_rating when 0 then -0.20 when 1 then -0.10 when 3 then 0.10 else 0 end));
    v_new_interval := case p_rating when 0 then 0 when 1 then 1 when 2 then 1 else 4 end;
    v_new_mastery := case p_rating when 0 then 0 when 1 then 5 when 2 then 12 else 18 end;
    v_new_due := case when p_rating = 0 then now() + interval '10 minutes' else now() + make_interval(days => v_new_interval) end;

    insert into public.review_progress(
      user_id,item_id,repetitions,interval_days,ease_factor,due_at,last_rating,last_reviewed_at,correct_count,wrong_count,mastery_score
    ) values (
      v_user,p_item_id,v_new_repetitions,v_new_interval,v_new_ease,v_new_due,p_rating,now(),
      case when p_rating >= 2 then 1 else 0 end,case when p_rating < 2 then 1 else 0 end,v_new_mastery
    ) returning * into v_row;
  else
    v_new_ease := greatest(1.30, least(3.50, v_row.ease_factor + case p_rating when 0 then -0.20 when 1 then -0.10 when 3 then 0.10 else 0 end));
    v_new_repetitions := case when p_rating = 0 then 0 else v_row.repetitions + 1 end;
    v_new_interval := case
      when p_rating = 0 then 0
      when p_rating = 1 then 1
      when p_rating = 2 and v_row.repetitions = 0 then 1
      when p_rating = 2 and v_row.repetitions = 1 then 3
      when p_rating = 2 then greatest(1, round(greatest(v_row.interval_days,1) * v_new_ease)::integer)
      when p_rating = 3 and v_row.repetitions = 0 then 4
      else greatest(2, round(greatest(v_row.interval_days,1) * v_new_ease * 1.30)::integer)
    end;
    v_new_mastery := least(100, greatest(0, v_row.mastery_score + case p_rating when 0 then -15 when 1 then 5 when 2 then 12 else 18 end));
    v_new_due := case when p_rating = 0 then now() + interval '10 minutes' else now() + make_interval(days => v_new_interval) end;

    update public.review_progress
    set repetitions=v_new_repetitions,interval_days=v_new_interval,ease_factor=v_new_ease,due_at=v_new_due,
        last_rating=p_rating,last_reviewed_at=now(),
        correct_count=correct_count + case when p_rating >= 2 then 1 else 0 end,
        wrong_count=wrong_count + case when p_rating < 2 then 1 else 0 end,
        mastery_score=v_new_mastery
    where user_id=v_user and item_id=p_item_id
    returning * into v_row;
  end if;

  return query select v_row.item_id,v_row.repetitions,v_row.interval_days,v_row.ease_factor,v_row.due_at,
    v_row.last_rating,v_row.last_reviewed_at,v_row.correct_count,v_row.wrong_count,v_row.mastery_score;
end;
$$;

revoke all on function public.record_hiragana_review(uuid, smallint) from public, anon;
grant execute on function public.record_hiragana_review(uuid, smallint) to authenticated;

with seed(prompt, reading, extra) as (
values
  ('あ', 'a', '{"group":"vokal","variant":"basic","sort_order":1}'::jsonb),
  ('い', 'i', '{"group":"vokal","variant":"basic","sort_order":2}'::jsonb),
  ('う', 'u', '{"group":"vokal","variant":"basic","sort_order":3}'::jsonb),
  ('え', 'e', '{"group":"vokal","variant":"basic","sort_order":4}'::jsonb),
  ('お', 'o', '{"group":"vokal","variant":"basic","sort_order":5}'::jsonb),
  ('か', 'ka', '{"group":"k","variant":"basic","sort_order":6}'::jsonb),
  ('き', 'ki', '{"group":"k","variant":"basic","sort_order":7}'::jsonb),
  ('く', 'ku', '{"group":"k","variant":"basic","sort_order":8}'::jsonb),
  ('け', 'ke', '{"group":"k","variant":"basic","sort_order":9}'::jsonb),
  ('こ', 'ko', '{"group":"k","variant":"basic","sort_order":10}'::jsonb),
  ('さ', 'sa', '{"group":"s","variant":"basic","sort_order":11}'::jsonb),
  ('し', 'shi', '{"group":"s","variant":"basic","sort_order":12}'::jsonb),
  ('す', 'su', '{"group":"s","variant":"basic","sort_order":13}'::jsonb),
  ('せ', 'se', '{"group":"s","variant":"basic","sort_order":14}'::jsonb),
  ('そ', 'so', '{"group":"s","variant":"basic","sort_order":15}'::jsonb),
  ('た', 'ta', '{"group":"t","variant":"basic","sort_order":16}'::jsonb),
  ('ち', 'chi', '{"group":"t","variant":"basic","sort_order":17}'::jsonb),
  ('つ', 'tsu', '{"group":"t","variant":"basic","sort_order":18}'::jsonb),
  ('て', 'te', '{"group":"t","variant":"basic","sort_order":19}'::jsonb),
  ('と', 'to', '{"group":"t","variant":"basic","sort_order":20}'::jsonb),
  ('な', 'na', '{"group":"n","variant":"basic","sort_order":21}'::jsonb),
  ('に', 'ni', '{"group":"n","variant":"basic","sort_order":22}'::jsonb),
  ('ぬ', 'nu', '{"group":"n","variant":"basic","sort_order":23}'::jsonb),
  ('ね', 'ne', '{"group":"n","variant":"basic","sort_order":24}'::jsonb),
  ('の', 'no', '{"group":"n","variant":"basic","sort_order":25}'::jsonb),
  ('は', 'ha', '{"group":"h","variant":"basic","sort_order":26}'::jsonb),
  ('ひ', 'hi', '{"group":"h","variant":"basic","sort_order":27}'::jsonb),
  ('ふ', 'fu', '{"group":"h","variant":"basic","sort_order":28}'::jsonb),
  ('へ', 'he', '{"group":"h","variant":"basic","sort_order":29}'::jsonb),
  ('ほ', 'ho', '{"group":"h","variant":"basic","sort_order":30}'::jsonb),
  ('ま', 'ma', '{"group":"m","variant":"basic","sort_order":31}'::jsonb),
  ('み', 'mi', '{"group":"m","variant":"basic","sort_order":32}'::jsonb),
  ('む', 'mu', '{"group":"m","variant":"basic","sort_order":33}'::jsonb),
  ('め', 'me', '{"group":"m","variant":"basic","sort_order":34}'::jsonb),
  ('も', 'mo', '{"group":"m","variant":"basic","sort_order":35}'::jsonb),
  ('や', 'ya', '{"group":"y","variant":"basic","sort_order":36}'::jsonb),
  ('ゆ', 'yu', '{"group":"y","variant":"basic","sort_order":37}'::jsonb),
  ('よ', 'yo', '{"group":"y","variant":"basic","sort_order":38}'::jsonb),
  ('ら', 'ra', '{"group":"r","variant":"basic","sort_order":39}'::jsonb),
  ('り', 'ri', '{"group":"r","variant":"basic","sort_order":40}'::jsonb),
  ('る', 'ru', '{"group":"r","variant":"basic","sort_order":41}'::jsonb),
  ('れ', 're', '{"group":"r","variant":"basic","sort_order":42}'::jsonb),
  ('ろ', 'ro', '{"group":"r","variant":"basic","sort_order":43}'::jsonb),
  ('わ', 'wa', '{"group":"w","variant":"basic","sort_order":44}'::jsonb),
  ('を', 'wo', '{"group":"w","variant":"basic","sort_order":45}'::jsonb),
  ('ん', 'n', '{"group":"n-special","variant":"basic","sort_order":46}'::jsonb),
  ('が', 'ga', '{"group":"g","variant":"dakuten","sort_order":47}'::jsonb),
  ('ぎ', 'gi', '{"group":"g","variant":"dakuten","sort_order":48}'::jsonb),
  ('ぐ', 'gu', '{"group":"g","variant":"dakuten","sort_order":49}'::jsonb),
  ('げ', 'ge', '{"group":"g","variant":"dakuten","sort_order":50}'::jsonb),
  ('ご', 'go', '{"group":"g","variant":"dakuten","sort_order":51}'::jsonb),
  ('ざ', 'za', '{"group":"z","variant":"dakuten","sort_order":52}'::jsonb),
  ('じ', 'ji', '{"group":"z","variant":"dakuten","sort_order":53}'::jsonb),
  ('ず', 'zu', '{"group":"z","variant":"dakuten","sort_order":54}'::jsonb),
  ('ぜ', 'ze', '{"group":"z","variant":"dakuten","sort_order":55}'::jsonb),
  ('ぞ', 'zo', '{"group":"z","variant":"dakuten","sort_order":56}'::jsonb),
  ('だ', 'da', '{"group":"d","variant":"dakuten","sort_order":57}'::jsonb),
  ('ぢ', 'ji', '{"group":"d","variant":"dakuten","sort_order":58}'::jsonb),
  ('づ', 'zu', '{"group":"d","variant":"dakuten","sort_order":59}'::jsonb),
  ('で', 'de', '{"group":"d","variant":"dakuten","sort_order":60}'::jsonb),
  ('ど', 'do', '{"group":"d","variant":"dakuten","sort_order":61}'::jsonb),
  ('ば', 'ba', '{"group":"b","variant":"dakuten","sort_order":62}'::jsonb),
  ('び', 'bi', '{"group":"b","variant":"dakuten","sort_order":63}'::jsonb),
  ('ぶ', 'bu', '{"group":"b","variant":"dakuten","sort_order":64}'::jsonb),
  ('べ', 'be', '{"group":"b","variant":"dakuten","sort_order":65}'::jsonb),
  ('ぼ', 'bo', '{"group":"b","variant":"dakuten","sort_order":66}'::jsonb),
  ('ぱ', 'pa', '{"group":"p","variant":"handakuten","sort_order":67}'::jsonb),
  ('ぴ', 'pi', '{"group":"p","variant":"handakuten","sort_order":68}'::jsonb),
  ('ぷ', 'pu', '{"group":"p","variant":"handakuten","sort_order":69}'::jsonb),
  ('ぺ', 'pe', '{"group":"p","variant":"handakuten","sort_order":70}'::jsonb),
  ('ぽ', 'po', '{"group":"p","variant":"handakuten","sort_order":71}'::jsonb),
  ('きゃ', 'kya', '{"group":"k","variant":"yoon","sort_order":72}'::jsonb),
  ('きゅ', 'kyu', '{"group":"k","variant":"yoon","sort_order":73}'::jsonb),
  ('きょ', 'kyo', '{"group":"k","variant":"yoon","sort_order":74}'::jsonb),
  ('しゃ', 'sha', '{"group":"s","variant":"yoon","sort_order":75}'::jsonb),
  ('しゅ', 'shu', '{"group":"s","variant":"yoon","sort_order":76}'::jsonb),
  ('しょ', 'sho', '{"group":"s","variant":"yoon","sort_order":77}'::jsonb),
  ('ちゃ', 'cha', '{"group":"t","variant":"yoon","sort_order":78}'::jsonb),
  ('ちゅ', 'chu', '{"group":"t","variant":"yoon","sort_order":79}'::jsonb),
  ('ちょ', 'cho', '{"group":"t","variant":"yoon","sort_order":80}'::jsonb),
  ('にゃ', 'nya', '{"group":"n","variant":"yoon","sort_order":81}'::jsonb),
  ('にゅ', 'nyu', '{"group":"n","variant":"yoon","sort_order":82}'::jsonb),
  ('にょ', 'nyo', '{"group":"n","variant":"yoon","sort_order":83}'::jsonb),
  ('ひゃ', 'hya', '{"group":"h","variant":"yoon","sort_order":84}'::jsonb),
  ('ひゅ', 'hyu', '{"group":"h","variant":"yoon","sort_order":85}'::jsonb),
  ('ひょ', 'hyo', '{"group":"h","variant":"yoon","sort_order":86}'::jsonb),
  ('みゃ', 'mya', '{"group":"m","variant":"yoon","sort_order":87}'::jsonb),
  ('みゅ', 'myu', '{"group":"m","variant":"yoon","sort_order":88}'::jsonb),
  ('みょ', 'myo', '{"group":"m","variant":"yoon","sort_order":89}'::jsonb),
  ('りゃ', 'rya', '{"group":"r","variant":"yoon","sort_order":90}'::jsonb),
  ('りゅ', 'ryu', '{"group":"r","variant":"yoon","sort_order":91}'::jsonb),
  ('りょ', 'ryo', '{"group":"r","variant":"yoon","sort_order":92}'::jsonb),
  ('ぎゃ', 'gya', '{"group":"g","variant":"yoon","sort_order":93}'::jsonb),
  ('ぎゅ', 'gyu', '{"group":"g","variant":"yoon","sort_order":94}'::jsonb),
  ('ぎょ', 'gyo', '{"group":"g","variant":"yoon","sort_order":95}'::jsonb),
  ('じゃ', 'ja', '{"group":"z","variant":"yoon","sort_order":96}'::jsonb),
  ('じゅ', 'ju', '{"group":"z","variant":"yoon","sort_order":97}'::jsonb),
  ('じょ', 'jo', '{"group":"z","variant":"yoon","sort_order":98}'::jsonb),
  ('びゃ', 'bya', '{"group":"b","variant":"yoon","sort_order":99}'::jsonb),
  ('びゅ', 'byu', '{"group":"b","variant":"yoon","sort_order":100}'::jsonb),
  ('びょ', 'byo', '{"group":"b","variant":"yoon","sort_order":101}'::jsonb),
  ('ぴゃ', 'pya', '{"group":"p","variant":"yoon","sort_order":102}'::jsonb),
  ('ぴゅ', 'pyu', '{"group":"p","variant":"yoon","sort_order":103}'::jsonb),
  ('ぴょ', 'pyo', '{"group":"p","variant":"yoon","sort_order":104}'::jsonb)
)
insert into public.learning_items(item_type,jlpt_level,prompt,reading,extra,is_published)
select 'hiragana','kana',seed.prompt,seed.reading,seed.extra,true
from seed
where not exists (
  select 1 from public.learning_items li
  where li.item_type='hiragana' and li.prompt=seed.prompt and coalesce(li.reading,'')=coalesce(seed.reading,'')
);

update public.learning_items set jlpt_level='kana',is_published=true where item_type='hiragana';

create index if not exists idx_learning_items_type_published on public.learning_items(item_type,is_published);
