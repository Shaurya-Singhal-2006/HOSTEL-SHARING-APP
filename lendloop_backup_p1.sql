--
-- PostgreSQL database dump
--

\restrict yznAwL9NqwIBmr30lngbMkzaV1dU04olPcZ2g8EeYH4mxzMhmphSs8lvZyEjwg1

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: CommunityJoinMode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CommunityJoinMode" AS ENUM (
    'open_with_code',
    'approval_required'
);


ALTER TYPE public."CommunityJoinMode" OWNER TO postgres;

--
-- Name: CommunityMemberRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CommunityMemberRole" AS ENUM (
    'admin',
    'member'
);


ALTER TYPE public."CommunityMemberRole" OWNER TO postgres;

--
-- Name: CommunityMemberStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CommunityMemberStatus" AS ENUM (
    'active',
    'pending',
    'removed'
);


ALTER TYPE public."CommunityMemberStatus" OWNER TO postgres;

--
-- Name: CommunityType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CommunityType" AS ENUM (
    'hostel',
    'apartment',
    'office',
    'college',
    'other'
);


ALTER TYPE public."CommunityType" OWNER TO postgres;

--
-- Name: ItemStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ItemStatus" AS ENUM (
    'available',
    'lent',
    'hidden'
);


ALTER TYPE public."ItemStatus" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'request_made',
    'request_accepted',
    'request_declined',
    'request_cancelled',
    'request_returned',
    'wanted_response',
    'wanted_helper_selected',
    'community_join_request'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: ReportStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReportStatus" AS ENUM (
    'open',
    'dismissed',
    'actioned'
);


ALTER TYPE public."ReportStatus" OWNER TO postgres;

--
-- Name: ReportTargetType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReportTargetType" AS ENUM (
    'user',
    'item'
);


ALTER TYPE public."ReportTargetType" OWNER TO postgres;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'returned',
    'cancelled'
);


ALTER TYPE public."RequestStatus" OWNER TO postgres;

--
-- Name: WantedStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WantedStatus" AS ENUM (
    'open',
    'fulfilled',
    'closed'
);


ALTER TYPE public."WantedStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: communities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communities (
    id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public."CommunityType" DEFAULT 'other'::public."CommunityType" NOT NULL,
    description text,
    invite_code character varying(8) NOT NULL,
    created_by uuid,
    is_active boolean DEFAULT true NOT NULL,
    join_mode public."CommunityJoinMode" DEFAULT 'open_with_code'::public."CommunityJoinMode" NOT NULL,
    icon text,
    accent_color character varying(7),
    level1_label text DEFAULT 'Floor'::text NOT NULL,
    level2_label text DEFAULT 'Room'::text NOT NULL,
    level1_options text[] DEFAULT ARRAY[]::text[] NOT NULL
);


ALTER TABLE public.communities OWNER TO postgres;

--
-- Name: community_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_members (
    id uuid NOT NULL,
    community_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public."CommunityMemberRole" DEFAULT 'member'::public."CommunityMemberRole" NOT NULL,
    status public."CommunityMemberStatus" DEFAULT 'active'::public."CommunityMemberStatus" NOT NULL,
    level1_value text,
    level2_value character varying(10),
    trust_score integer DEFAULT 0 NOT NULL,
    accepted_guidelines_at timestamp(6) with time zone,
    joined_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.community_members OWNER TO postgres;

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    community_id uuid NOT NULL
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id uuid NOT NULL,
    community_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    condition text NOT NULL,
    photos text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status public."ItemStatus" DEFAULT 'available'::public."ItemStatus" NOT NULL,
    max_lend_days integer NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT items_max_lend_days_check CHECK (((max_lend_days >= 1) AND (max_lend_days <= 365))),
    CONSTRAINT items_photos_limit_check CHECK ((cardinality(photos) <= 3))
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public."NotificationType" NOT NULL,
    request_id uuid,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    wanted_post_id uuid,
    community_id uuid NOT NULL,
    CONSTRAINT notifications_exactly_one_target_check CHECK (((request_id IS NOT NULL) <> (wanted_post_id IS NOT NULL)))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ratings (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    thumbs_up boolean NOT NULL,
    comment text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    community_id uuid NOT NULL,
    CONSTRAINT ratings_distinct_users_check CHECK ((from_user_id <> to_user_id))
);


ALTER TABLE public.ratings OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id uuid NOT NULL,
    community_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    target_type public."ReportTargetType" NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL,
    note text,
    status public."ReportStatus" DEFAULT 'open'::public."ReportStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requests (
    id uuid NOT NULL,
    item_id uuid NOT NULL,
    borrower_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    note text NOT NULL,
    status public."RequestStatus" DEFAULT 'pending'::public."RequestStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    returned_at timestamp(6) with time zone,
    decline_reason character varying(200),
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    community_id uuid NOT NULL,
    CONSTRAINT requests_date_order_check CHECK ((from_date <= to_date)),
    CONSTRAINT requests_not_own_item_check CHECK ((borrower_id <> owner_id))
);


ALTER TABLE public.requests OWNER TO postgres;

--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_blocks (
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_blocks_not_self_check CHECK ((blocker_id <> blocked_id))
);


ALTER TABLE public.user_blocks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    community_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    floor integer,
    room text,
    phone text,
    trust_score integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    google_id text,
    avatar_url text,
    joined_hostel boolean DEFAULT false NOT NULL,
    onboarding_tour_completed boolean DEFAULT false NOT NULL,
    CONSTRAINT users_floor_check CHECK (((floor IS NULL) OR ((floor >= 0) AND (floor <= 5)))),
    CONSTRAINT users_room_format_check CHECK (((room IS NULL) OR (room ~ '^[A-Z][0-9]{1,3}$'::text)))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wanted_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wanted_posts (
    id uuid NOT NULL,
    community_id uuid NOT NULL,
    author_id uuid NOT NULL,
    title text NOT NULL,
    note text NOT NULL,
    needed_by date,
    status public."WantedStatus" DEFAULT 'open'::public."WantedStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    category text DEFAULT 'Other'::text NOT NULL,
    helper_id uuid
);


ALTER TABLE public.wanted_posts OWNER TO postgres;

--
-- Name: wanted_responses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wanted_responses (
    id uuid NOT NULL,
    wanted_post_id uuid NOT NULL,
    responder_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    community_id uuid NOT NULL
);


ALTER TABLE public.wanted_responses OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
9eefde1b-0c0f-4d3e-9d23-05de977b8f3e	37f68dc37ab10a122912fd75b409f01c9fc0e40ec60ffea4437f733232810970	2026-11-19 13:35:08.879336+05:30	20261119000000_init	\N	\N	2026-11-19 13:35:08.685329+05:30	1
9e0dd8d9-20dc-49ea-b304-f9d355e743f9	9af1ad749f8ce8e097ed14471170bbbb54cac07add9edadf69c5133ac5d5e1ac	2026-11-19 14:41:30.005637+05:30	20261119000100_google_auth_and_invites	\N	\N	2026-11-19 14:41:29.950112+05:30	1
70d70fe8-9006-4776-8e07-25ee6e2fbbc4	4cbffa2263c2f3c7a626a9c8fe8f11e7f348880a9ef8fc790a18bc8fd0116e1f	2026-11-19 15:36:59.342114+05:30	20261119000200_phase3_item_search_indexes	\N	\N	2026-11-19 15:36:59.32382+05:30	1
e287f114-60e4-46fd-9fe4-dc49aa383cf7	5f3f5e92e91eee6bfe1dd3065128b78f6be5027520a300fe2b17d37edcae8e87	2026-11-19 16:04:45.762164+05:30	20261119000300_phase4_requests_notifications_locations	\N	\N	2026-11-19 16:04:45.695262+05:30	1
e35e6269-b911-490f-8a9b-6118466e320e	7f532fdc1c7e6ed6255014818d443a72e682f5ebb544b1361306508640c3c18d	2026-11-19 16:31:05.154578+05:30	20261119000400_phase5_wanted_ratings	\N	\N	2026-11-19 16:31:05.080594+05:30	1
2b08ae73-27b0-4e2f-9753-e2d003aa3797	890decc9e4a609731cb94d97d26d5f46cccd6a04b326eec8d3866211e0981d94	2026-11-19 17:13:04.804705+05:30	20261119000500_phase6_onboarding_feedback	\N	\N	2026-11-19 17:13:04.784171+05:30	1
b2342eb0-6b40-43ce-b7ff-999bf167c691	0cbb7dfa47e195282a5873ddefb7908146e070b0b8b3992b64d954665a389012	2026-11-22 23:55:46.578255+05:30	20261122000000_phase7_community_foundation	\N	\N	2026-11-22 23:55:46.44207+05:30	1
729aa548-354f-4e5e-b7d2-8606d0cd2bb0	70721e65fa8368b227cda6ce3d30384f56b5dc53ae4bb66e42f3d29c63ac2c03	2026-11-23 00:19:25.71182+05:30	20261123000000_community_join_notifications	\N	\N	2026-11-23 00:19:25.704921+05:30	1
\.


--
-- Data for Name: communities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.communities (id, name, created_at, type, description, invite_code, created_by, is_active, join_mode, icon, accent_color, level1_label, level2_label, level1_options) FROM stdin;
00000000-0000-4000-8000-000000000001	My Community	2026-11-19 13:35:19.473+05:30	other	\N	KUADYXGC	f2711e17-ad21-4976-b96e-64e719f5ffe9	t	open_with_code	\N	\N	Floor	Room	{Basement,1,2,3,4,5}
\.


--
-- Data for Name: community_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.community_members (id, community_id, user_id, role, status, level1_value, level2_value, trust_score, accepted_guidelines_at, joined_at) FROM stdin;
8c3c2efc-67c1-4b97-b0a3-e1f575c2827e	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000001	member	active	2	B16	8	\N	2026-11-19 15:37:12.649+05:30
af351dbc-b842-4d6e-82cb-ff7fb6c8d2e6	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000002	member	active	Basement	D3	5	\N	2026-11-19 15:37:12.653+05:30
b07306f2-970d-470b-b54b-0ce6f592bf6e	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000003	member	active	1	A7	12	\N	2026-11-19 15:37:12.655+05:30
efcc0ea8-de59-48c7-9b35-1a67135da4db	00000000-0000-4000-8000-000000000001	f2711e17-ad21-4976-b96e-64e719f5ffe9	admin	active	2	B2	0	\N	2026-11-19 14:42:27.043+05:30
09236cac-bed1-4293-917d-71e24d5b4bff	00000000-0000-4000-8000-000000000001	7358a01c-66df-47d7-ae2f-96565d85410a	member	active	3	C5	0	\N	2026-11-19 16:31:51.473+05:30
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback (id, user_id, message, created_at, community_id) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, community_id, owner_id, title, description, category, condition, photos, status, max_lend_days, created_at) FROM stdin;
30000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000001	Cordless drill machine	A compact drill with a full battery and a small set of bits.	Tools	Good	{}	available	2	2026-11-19 15:37:12.656+05:30
30000000-0000-4000-8000-000000000002	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000002	Steam iron	Lightweight iron with a working spray function.	Clothing/Laundry	Good	{}	available	3	2026-11-19 15:37:12.707+05:30
30000000-0000-4000-8000-000000000003	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000003	Extension board	Four sockets and a 2 metre cable. Please return it coiled.	Electronics	Used	{}	available	2	2026-11-19 15:37:12.708+05:30
30000000-0000-4000-8000-000000000004	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000001	Electric kettle	1.5 litre kettle, clean and ready to use.	Kitchen	Good	{}	available	2	2026-11-19 15:37:12.709+05:30
30000000-0000-4000-8000-000000000005	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000002	Hair dryer	Foldable travel dryer with two heat settings.	Electronics	Good	{}	available	2	2026-11-19 15:37:12.71+05:30
30000000-0000-4000-8000-000000000006	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000003	Screwdriver set	A small precision set for quick repairs.	Tools	New	{}	available	1	2026-11-19 15:37:12.711+05:30
30000000-0000-4000-8000-000000000007	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000001	Desk lamp	LED lamp with adjustable brightness and USB power.	Study	Good	{}	available	7	2026-11-19 15:37:12.712+05:30
30000000-0000-4000-8000-000000000008	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000002	Badminton racquets	Pair of racquets with a few shuttlecocks.	Sports	Used	{}	available	1	2026-11-19 15:37:12.713+05:30
30000000-0000-4000-8000-000000000009	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000003	Floor mop	Microfibre mop with a spare clean pad.	Cleaning	Good	{}	available	2	2026-11-19 15:37:12.714+05:30
30000000-0000-4000-8000-000000000010	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000001	Non-stick pan	Medium pan, suitable for induction cooktops.	Kitchen	Good	{}	available	2	2026-11-19 15:37:12.715+05:30
30000000-0000-4000-8000-000000000011	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000002	Scientific calculator	Casio calculator for coursework and exams.	Study	Good	{}	available	5	2026-11-19 15:37:12.716+05:30
30000000-0000-4000-8000-000000000012	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000003	Yoga mat	Comfortable mat, cleaned after each use.	Sports	Good	{}	available	3	2026-11-19 15:37:12.717+05:30
30000000-0000-4000-8000-000000000013	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000001	Laundry basket	Foldable mesh hamper that fits under a bed.	Clothing/Laundry	Used	{}	available	2	2026-11-19 15:37:12.718+05:30
30000000-0000-4000-8000-000000000014	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000002	USB-C charger	65W charger with a 1.5 metre cable.	Electronics	New	{}	available	2	2026-11-19 15:37:12.719+05:30
30000000-0000-4000-8000-000000000015	00000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000003	Measuring tape	Five metre tape for room and furniture measurements.	Tools	Good	{}	available	1	2026-11-19 15:37:12.72+05:30
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, request_id, message, read, created_at, wanted_post_id, community_id) FROM stdin;
34436d9a-c85e-40d1-b70e-6dd8a07bae7e	7358a01c-66df-47d7-ae2f-96565d85410a	wanted_response	\N	shaurya singhal can help with shaurya singhal.	t	2026-11-19 16:47:20.555+05:30	42decab8-4185-439d-a351-8862e5ce106d	00000000-0000-4000-8000-000000000001
34f9da96-91fd-4d7e-893b-fa743deec5f1	7358a01c-66df-47d7-ae2f-96565d85410a	wanted_response	\N	shaurya singhal can help with DUMBLE.	t	2026-11-19 16:48:19.687+05:30	8a0b0ba1-5d9a-4d01-9edb-8aa78630ea5d	00000000-0000-4000-8000-000000000001
a9db1057-e5d8-4ba5-8915-a937e9e36d57	7358a01c-66df-47d7-ae2f-96565d85410a	wanted_helper_selected	\N	shaurya singhal marked you as the helper for their wanted post.	t	2026-11-19 16:50:25.519+05:30	dbda9785-043f-408f-8cef-9edb127ac542	00000000-0000-4000-8000-000000000001
f763c4ff-5d57-40f6-942c-1b2ba4744acf	f2711e17-ad21-4976-b96e-64e719f5ffe9	wanted_helper_selected	\N	raghav marked you as the helper for their wanted post.	t	2026-11-19 16:48:50.086+05:30	8a0b0ba1-5d9a-4d01-9edb-8aa78630ea5d	00000000-0000-4000-8000-000000000001
1a52b8f4-af8b-4d2d-80b0-941f74293e60	f2711e17-ad21-4976-b96e-64e719f5ffe9	wanted_response	\N	raghav can help with shaurya singhal.	t	2026-11-19 16:49:29.111+05:30	dbda9785-043f-408f-8cef-9edb127ac542	00000000-0000-4000-8000-000000000001
22ca2805-de24-46fa-b1cf-24b04bbd6ae2	f2711e17-ad21-4976-b96e-64e719f5ffe9	wanted_helper_selected	\N	raghav marked you as the helper for their wanted post.	t	2026-11-19 17:41:27.398+05:30	a7aa57db-ce5b-4b4a-a3ac-d253e8a521ec	00000000-0000-4000-8000-000000000001
a7c61ef0-605f-4dcd-9e8e-510ee0674c0d	7358a01c-66df-47d7-ae2f-96565d85410a	wanted_response	\N	shaurya singhal can help with happy.	t	2026-11-19 17:41:22.786+05:30	a7aa57db-ce5b-4b4a-a3ac-d253e8a521ec	00000000-0000-4000-8000-000000000001
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ratings (id, request_id, from_user_id, to_user_id, thumbs_up, comment, created_at, community_id) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, community_id, reporter_id, target_type, target_id, reason, note, status, created_at) FROM stdin;
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.requests (id, item_id, borrower_id, owner_id, from_date, to_date, note, status, created_at, returned_at, decline_reason, updated_at, community_id) FROM stdin;
\.


--
-- Data for Name: user_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_blocks (blocker_id, blocked_id, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, community_id, name, email, floor, room, phone, trust_score, created_at, google_id, avatar_url, joined_hostel, onboarding_tour_completed) FROM stdin;
20000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000001	Maya Iyer	maya.demo@example.test	2	B16	\N	8	2026-11-19 15:37:12.649+05:30	\N	\N	t	t
20000000-0000-4000-8000-000000000002	00000000-0000-4000-8000-000000000001	Kabir Rao	kabir.demo@example.test	0	D3	\N	5	2026-11-19 15:37:12.653+05:30	\N	\N	t	t
20000000-0000-4000-8000-000000000003	00000000-0000-4000-8000-000000000001	Zoya Khan	zoya.demo@example.test	1	A7	\N	12	2026-11-19 15:37:12.655+05:30	\N	\N	t	t
f2711e17-ad21-4976-b96e-64e719f5ffe9	00000000-0000-4000-8000-000000000001	shaurya singhal	shauryasinghal206@gmail.com	2	B2	\N	0	2026-11-19 14:42:27.043+05:30	106020033660753033457	https://lh3.googleusercontent.com/a/ACg8ocKdyphQuAy9UOtAQNaHaKXSAK3KJz79edsuLvVh6sWA5Qu5VgQ=s96-c	t	t
7358a01c-66df-47d7-ae2f-96565d85410a	00000000-0000-4000-8000-000000000001	raghav	shauryasinghal707@gmail.com	3	C5	\N	0	2026-11-19 16:31:51.473+05:30	106928488013868483864	https://lh3.googleusercontent.com/a/ACg8ocI9UIYgH4jJ1PXQ2jXC-g1XHJ2wFQ9BIw7ttzCJydU_S0TYcw=s96-c	t	t
\.


--
-- Data for Name: wanted_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wanted_posts (id, community_id, author_id, title, note, needed_by, status, created_at, category, helper_id) FROM stdin;
42decab8-4185-439d-a351-8862e5ce106d	00000000-0000-4000-8000-000000000001	7358a01c-66df-47d7-ae2f-96565d85410a	shaurya singhal		\N	fulfilled	2026-11-19 16:47:11.375+05:30	Other	\N
8a0b0ba1-5d9a-4d01-9edb-8aa78630ea5d	00000000-0000-4000-8000-000000000001	7358a01c-66df-47d7-ae2f-96565d85410a	DUMBLE		\N	fulfilled	2026-11-19 16:48:05.287+05:30	Sports	f2711e17-ad21-4976-b96e-64e719f5ffe9
dbda9785-043f-408f-8cef-9edb127ac542	00000000-0000-4000-8000-000000000001	f2711e17-ad21-4976-b96e-64e719f5ffe9	shaurya singhal		\N	fulfilled	2026-11-19 16:49:09.153+05:30	Other	7358a01c-66df-47d7-ae2f-96565d85410a
a7aa57db-ce5b-4b4a-a3ac-d253e8a521ec	00000000-0000-4000-8000-000000000001	7358a01c-66df-47d7-ae2f-96565d85410a	happy		\N	fulfilled	2026-11-19 17:41:12.562+05:30	Other	f2711e17-ad21-4976-b96e-64e719f5ffe9
\.


--
-- Data for Name: wanted_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wanted_responses (id, wanted_post_id, responder_id, message, created_at, community_id) FROM stdin;
9f010096-828a-438d-80b8-debe29939c6b	42decab8-4185-439d-a351-8862e5ce106d	f2711e17-ad21-4976-b96e-64e719f5ffe9		2026-11-19 16:47:20.552+05:30	00000000-0000-4000-8000-000000000001
86b599c4-2391-4f97-b38a-62d78587da43	8a0b0ba1-5d9a-4d01-9edb-8aa78630ea5d	f2711e17-ad21-4976-b96e-64e719f5ffe9		2026-11-19 16:48:19.684+05:30	00000000-0000-4000-8000-000000000001
221fd5fe-fed4-4d29-b3bf-209bd73eea60	dbda9785-043f-408f-8cef-9edb127ac542	7358a01c-66df-47d7-ae2f-96565d85410a		2026-11-19 16:49:29.11+05:30	00000000-0000-4000-8000-000000000001
202bc773-5324-4018-8ba3-42b6e7fdbfd5	a7aa57db-ce5b-4b4a-a3ac-d253e8a521ec	f2711e17-ad21-4976-b96e-64e719f5ffe9		2026-11-19 17:41:22.784+05:30	00000000-0000-4000-8000-000000000001
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- Name: community_members community_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: requests requests_no_accepted_overlap; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_no_accepted_overlap EXCLUDE USING gist (item_id WITH =, daterange(from_date, to_date, '[]'::text) WITH &&) WHERE ((status = 'accepted'::public."RequestStatus"));


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (blocker_id, blocked_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wanted_posts wanted_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_posts
    ADD CONSTRAINT wanted_posts_pkey PRIMARY KEY (id);


--
-- Name: wanted_responses wanted_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_responses
    ADD CONSTRAINT wanted_responses_pkey PRIMARY KEY (id);


--
-- Name: communities_invite_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX communities_invite_code_key ON public.communities USING btree (invite_code);


--
-- Name: community_members_community_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX community_members_community_id_status_idx ON public.community_members USING btree (community_id, status);


--
-- Name: community_members_community_id_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX community_members_community_id_user_id_key ON public.community_members USING btree (community_id, user_id);


--
-- Name: community_members_user_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX community_members_user_id_status_idx ON public.community_members USING btree (user_id, status);


--
-- Name: feedback_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_community_id_idx ON public.feedback USING btree (community_id);


--
-- Name: feedback_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_created_at_idx ON public.feedback USING btree (created_at DESC);


--
-- Name: items_community_id_category_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX items_community_id_category_created_at_idx ON public.items USING btree (community_id, category, created_at DESC);


--
-- Name: items_community_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX items_community_id_created_at_idx ON public.items USING btree (community_id, created_at DESC);


--
-- Name: items_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX items_community_id_idx ON public.items USING btree (community_id);


--
-- Name: items_owner_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX items_owner_id_idx ON public.items USING btree (owner_id);


--
-- Name: items_search_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX items_search_idx ON public.items USING gin (to_tsvector('english'::regconfig, ((title || ' '::text) || description)));


--
-- Name: items_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX items_status_idx ON public.items USING btree (status);


--
-- Name: notifications_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_community_id_idx ON public.notifications USING btree (community_id);


--
-- Name: notifications_request_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_request_id_idx ON public.notifications USING btree (request_id);


--
-- Name: notifications_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: notifications_wanted_post_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_wanted_post_id_idx ON public.notifications USING btree (wanted_post_id);


--
-- Name: ratings_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ratings_community_id_idx ON public.ratings USING btree (community_id);


--
-- Name: ratings_request_id_from_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ratings_request_id_from_user_id_key ON public.ratings USING btree (request_id, from_user_id);


--
-- Name: ratings_to_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ratings_to_user_id_created_at_idx ON public.ratings USING btree (to_user_id, created_at DESC);


--
-- Name: ratings_to_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ratings_to_user_id_idx ON public.ratings USING btree (to_user_id);


--
-- Name: reports_community_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_community_id_status_created_at_idx ON public.reports USING btree (community_id, status, created_at DESC);


--
-- Name: reports_reporter_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_reporter_id_created_at_idx ON public.reports USING btree (reporter_id, created_at DESC);


--
-- Name: reports_target_type_target_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_target_type_target_id_idx ON public.reports USING btree (target_type, target_id);


--
-- Name: requests_borrower_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requests_borrower_id_idx ON public.requests USING btree (borrower_id);


--
-- Name: requests_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requests_community_id_idx ON public.requests USING btree (community_id);


--
-- Name: requests_item_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requests_item_id_status_idx ON public.requests USING btree (item_id, status);


--
-- Name: requests_one_active_per_borrower_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX requests_one_active_per_borrower_item_idx ON public.requests USING btree (borrower_id, item_id) WHERE (status = ANY (ARRAY['pending'::public."RequestStatus", 'accepted'::public."RequestStatus"]));


--
-- Name: requests_owner_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requests_owner_id_idx ON public.requests USING btree (owner_id);


--
-- Name: requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requests_status_idx ON public.requests USING btree (status);


--
-- Name: user_blocks_blocked_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_blocks_blocked_id_idx ON public.user_blocks USING btree (blocked_id);


--
-- Name: users_community_id_floor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_community_id_floor_idx ON public.users USING btree (community_id, floor);


--
-- Name: users_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_community_id_idx ON public.users USING btree (community_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_google_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_google_id_key ON public.users USING btree (google_id);


--
-- Name: wanted_posts_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wanted_posts_community_id_idx ON public.wanted_posts USING btree (community_id);


--
-- Name: wanted_posts_community_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wanted_posts_community_id_status_idx ON public.wanted_posts USING btree (community_id, status);


--
-- Name: wanted_posts_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wanted_posts_status_created_at_idx ON public.wanted_posts USING btree (status, created_at DESC);


--
-- Name: wanted_responses_community_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wanted_responses_community_id_idx ON public.wanted_responses USING btree (community_id);


--
-- Name: wanted_responses_wanted_post_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wanted_responses_wanted_post_id_idx ON public.wanted_responses USING btree (wanted_post_id);


--
-- Name: wanted_responses_wanted_post_id_responder_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX wanted_responses_wanted_post_id_responder_id_key ON public.wanted_responses USING btree (wanted_post_id, responder_id);


--
-- Name: communities communities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: community_members community_members_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: community_members community_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: feedback feedback_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: items items_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: items items_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_wanted_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_wanted_post_id_fkey FOREIGN KEY (wanted_post_id) REFERENCES public.wanted_posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ratings ratings_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ratings ratings_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ratings ratings_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ratings ratings_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports reports_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: requests requests_borrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: requests requests_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: requests requests_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: requests requests_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: wanted_posts wanted_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_posts
    ADD CONSTRAINT wanted_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wanted_posts wanted_posts_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_posts
    ADD CONSTRAINT wanted_posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: wanted_posts wanted_posts_helper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_posts
    ADD CONSTRAINT wanted_posts_helper_id_fkey FOREIGN KEY (helper_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: wanted_responses wanted_responses_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_responses
    ADD CONSTRAINT wanted_responses_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: wanted_responses wanted_responses_responder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_responses
    ADD CONSTRAINT wanted_responses_responder_id_fkey FOREIGN KEY (responder_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wanted_responses wanted_responses_wanted_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wanted_responses
    ADD CONSTRAINT wanted_responses_wanted_post_id_fkey FOREIGN KEY (wanted_post_id) REFERENCES public.wanted_posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict yznAwL9NqwIBmr30lngbMkzaV1dU04olPcZ2g8EeYH4mxzMhmphSs8lvZyEjwg1

