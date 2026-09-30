--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _CategoryToMission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_CategoryToMission" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _CategoryToSkill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_CategoryToSkill" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _ContractToOffer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_ContractToOffer" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _ContractToPayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_ContractToPayment" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _MissionToSkill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_MissionToSkill" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _OfferToPayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_OfferToPayment" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _UserSkills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_UserSkills" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    name character varying(255) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryId" text NOT NULL,
    "createdById" text
);


--
-- Name: conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conflicts (
    id text NOT NULL,
    status text NOT NULL,
    motive text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contractId" text NOT NULL,
    "assignedAdminId" text,
    "reporterId" text NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id text NOT NULL,
    "contractTerms" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "missionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dailyRate" numeric(10,2) NOT NULL,
    "adminId" text NOT NULL,
    "freelancerId" text NOT NULL,
    "seenByClientAt" timestamp(3) without time zone
);


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "userId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastReadAt" timestamp(3) without time zone
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "missionId" text,
    "conflictId" text
);


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currencies (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    type character varying(50) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "senderId" text NOT NULL,
    "conversationId" text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "replyToId" text,
    "messageId" text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL
);


--
-- Name: missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missions (
    id text NOT NULL,
    "dailyRate" numeric(10,2) NOT NULL,
    timeframe integer NOT NULL,
    description text NOT NULL,
    "clientId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "startDate" timestamp(3) without time zone,
    timezone timestamp(3) without time zone,
    status text DEFAULT 'OPEN'::text NOT NULL,
    title text NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verifierId" text,
    deadline timestamp(3) without time zone,
    "gracePeriodEnd" timestamp(3) without time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    type character varying(50) NOT NULL,
    "conflictId" text,
    "missionId" text,
    title character varying(255),
    message text,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id text NOT NULL,
    status text NOT NULL,
    "dailyRate" numeric(10,2) NOT NULL,
    "proposalText" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "freelancerId" text NOT NULL,
    "missionId" text NOT NULL,
    "seenByFreelancerAt" timestamp(3) without time zone
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    amount numeric(15,2) NOT NULL,
    "paymentMethod" text NOT NULL,
    "transactionDate" timestamp(3) without time zone NOT NULL,
    "missionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    "userId" text NOT NULL,
    "conversionRate" numeric(15,8),
    "cryptoAmount" numeric(20,8),
    "cryptoCurrency" text,
    "cryptoTransactionHash" text,
    "cryptoWalletAddress" text,
    "currencyId" text,
    "seenByFreelancerAt" timestamp(3) without time zone
);


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id text NOT NULL,
    name character varying(255),
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    url character varying(255),
    picture text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "portfolioId" text NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id text NOT NULL,
    content text NOT NULL,
    rating integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reviewerId" text NOT NULL,
    "receiverId" text NOT NULL,
    "missionId" text
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "clerkId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    address text,
    "bankAccount" text,
    "firstName" text,
    "lastName" text,
    login text,
    password text,
    "phoneNumber" text,
    vat text,
    "companyName" text,
    "cryptoWalletAddress" text,
    "dailyRate" numeric(10,2),
    description text,
    "preferredPaymentMethod" text DEFAULT 'EUR'::text,
    "roleId" text NOT NULL,
    picture text
);


--
-- Name: _CategoryToMission _CategoryToMission_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_CategoryToMission"
    ADD CONSTRAINT "_CategoryToMission_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _CategoryToSkill _CategoryToSkill_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_CategoryToSkill"
    ADD CONSTRAINT "_CategoryToSkill_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _ContractToOffer _ContractToOffer_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ContractToOffer"
    ADD CONSTRAINT "_ContractToOffer_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _ContractToPayment _ContractToPayment_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ContractToPayment"
    ADD CONSTRAINT "_ContractToPayment_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _MissionToSkill _MissionToSkill_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_MissionToSkill"
    ADD CONSTRAINT "_MissionToSkill_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _OfferToPayment _OfferToPayment_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_OfferToPayment"
    ADD CONSTRAINT "_OfferToPayment_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _UserSkills _UserSkills_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_UserSkills"
    ADD CONSTRAINT "_UserSkills_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY ("categoryId");


--
-- Name: conflicts conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conflicts
    ADD CONSTRAINT conflicts_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT "portfolios_userId_key" UNIQUE ("userId");


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: _CategoryToMission_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_CategoryToMission_B_index" ON public."_CategoryToMission" USING btree ("B");


--
-- Name: _CategoryToSkill_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_CategoryToSkill_B_index" ON public."_CategoryToSkill" USING btree ("B");


--
-- Name: _ContractToOffer_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_ContractToOffer_B_index" ON public."_ContractToOffer" USING btree ("B");


--
-- Name: _ContractToPayment_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_ContractToPayment_B_index" ON public."_ContractToPayment" USING btree ("B");


--
-- Name: _MissionToSkill_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_MissionToSkill_B_index" ON public."_MissionToSkill" USING btree ("B");


--
-- Name: _OfferToPayment_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_OfferToPayment_B_index" ON public."_OfferToPayment" USING btree ("B");


--
-- Name: _UserSkills_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_UserSkills_B_index" ON public."_UserSkills" USING btree ("B");


--
-- Name: categories_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);


--
-- Name: contracts_missionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "contracts_missionId_key" ON public.contracts USING btree ("missionId");


--
-- Name: conversation_participants_conversationId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON public.conversation_participants USING btree ("conversationId", "userId");


--
-- Name: currencies_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX currencies_code_key ON public.currencies USING btree (code);


--
-- Name: messages_messageId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "messages_messageId_key" ON public.messages USING btree ("messageId");


--
-- Name: projects_portfolioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_portfolioId_idx" ON public.projects USING btree ("portfolioId");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: skills_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX skills_name_key ON public.skills USING btree (name);


--
-- Name: users_clerkId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_clerkId_key" ON public.users USING btree ("clerkId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_login_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_login_key ON public.users USING btree (login);


--
-- Name: _CategoryToMission _CategoryToMission_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_CategoryToMission"
    ADD CONSTRAINT "_CategoryToMission_A_fkey" FOREIGN KEY ("A") REFERENCES public.categories("categoryId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CategoryToMission _CategoryToMission_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_CategoryToMission"
    ADD CONSTRAINT "_CategoryToMission_B_fkey" FOREIGN KEY ("B") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CategoryToSkill _CategoryToSkill_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_CategoryToSkill"
    ADD CONSTRAINT "_CategoryToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES public.categories("categoryId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CategoryToSkill _CategoryToSkill_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_CategoryToSkill"
    ADD CONSTRAINT "_CategoryToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES public.skills(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ContractToOffer _ContractToOffer_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ContractToOffer"
    ADD CONSTRAINT "_ContractToOffer_A_fkey" FOREIGN KEY ("A") REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ContractToOffer _ContractToOffer_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ContractToOffer"
    ADD CONSTRAINT "_ContractToOffer_B_fkey" FOREIGN KEY ("B") REFERENCES public.offers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ContractToPayment _ContractToPayment_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ContractToPayment"
    ADD CONSTRAINT "_ContractToPayment_A_fkey" FOREIGN KEY ("A") REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _ContractToPayment _ContractToPayment_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_ContractToPayment"
    ADD CONSTRAINT "_ContractToPayment_B_fkey" FOREIGN KEY ("B") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _MissionToSkill _MissionToSkill_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_MissionToSkill"
    ADD CONSTRAINT "_MissionToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _MissionToSkill _MissionToSkill_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_MissionToSkill"
    ADD CONSTRAINT "_MissionToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES public.skills(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _OfferToPayment _OfferToPayment_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_OfferToPayment"
    ADD CONSTRAINT "_OfferToPayment_A_fkey" FOREIGN KEY ("A") REFERENCES public.offers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _OfferToPayment _OfferToPayment_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_OfferToPayment"
    ADD CONSTRAINT "_OfferToPayment_B_fkey" FOREIGN KEY ("B") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserSkills _UserSkills_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_UserSkills"
    ADD CONSTRAINT "_UserSkills_A_fkey" FOREIGN KEY ("A") REFERENCES public.skills(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserSkills _UserSkills_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_UserSkills"
    ADD CONSTRAINT "_UserSkills_B_fkey" FOREIGN KEY ("B") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conflicts conflicts_assignedAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conflicts
    ADD CONSTRAINT "conflicts_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conflicts conflicts_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conflicts
    ADD CONSTRAINT "conflicts_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conflicts conflicts_involvedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conflicts
    ADD CONSTRAINT "conflicts_involvedUserId_fkey" FOREIGN KEY ("reporterId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contracts contracts_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "contracts_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contracts contracts_freelancerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "contracts_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contracts contracts_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "contracts_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conversation_participants conversation_participants_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_conflictId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES public.conflicts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversations conversations_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_replyToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES public.messages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: missions missions_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT "missions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: missions missions_verifierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT "missions_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: offers offers_freelancerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT "offers_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: offers offers_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT "offers_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_currencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES public.currencies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: portfolios portfolios_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects projects_portfolioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES public.portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reviews reviews_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews reviews_reviewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: skills skills_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT "skills_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

