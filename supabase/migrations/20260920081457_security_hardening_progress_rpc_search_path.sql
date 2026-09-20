-- KOJAC LMS v1.3 — Security Hardening
-- Production migration version: 20260920081457
-- Behavior-preserving hardening: normalize SECURITY DEFINER search_path.

alter function public.record_hiragana_review(uuid, smallint)
  set search_path to pg_catalog, public;

alter function public.record_learning_review(uuid, smallint)
  set search_path to pg_catalog, public;

alter function public.record_listening_completion(text, integer, integer, integer, integer, integer, text)
  set search_path to pg_catalog, public;

alter function public.record_reading_completion(text, text, integer, integer, text)
  set search_path to pg_catalog, public;
