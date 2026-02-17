-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "id_number" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "department" VARCHAR(50),
    "date_registered" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "locations" (
    "location_id" SERIAL NOT NULL,
    "location_name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "lost_items" (
    "lost_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "date_lost" DATE NOT NULL,
    "last_seen_location" VARCHAR(200) NOT NULL,
    "image" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'REPORTED_LOST',
    "date_created" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "lost_items_pkey" PRIMARY KEY ("lost_id")
);

-- CreateTable
CREATE TABLE "found_items" (
    "found_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "date_found" DATE NOT NULL,
    "storage_location" VARCHAR(200) NOT NULL,
    "image" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEWLY_FOUND',
    "date_created" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "found_items_pkey" PRIMARY KEY ("found_id")
);

-- CreateTable
CREATE TABLE "matches" (
    "match_id" SERIAL NOT NULL,
    "lost_id" INTEGER NOT NULL,
    "found_id" INTEGER NOT NULL,
    "match_score" DECIMAL(5,2) NOT NULL,
    "date_matched" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "claims" (
    "claim_id" SERIAL NOT NULL,
    "found_id" INTEGER NOT NULL,
    "claimant_id" INTEGER NOT NULL,
    "verified_by" INTEGER,
    "proof_description" TEXT NOT NULL,
    "claim_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "date_claimed" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("claim_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_number_key" ON "users"("id_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_category_name_key" ON "categories"("category_name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_location_name_key" ON "locations"("location_name");

-- CreateIndex
CREATE INDEX "lost_items_user_id_idx" ON "lost_items"("user_id");

-- CreateIndex
CREATE INDEX "lost_items_category_id_idx" ON "lost_items"("category_id");

-- CreateIndex
CREATE INDEX "lost_items_location_id_idx" ON "lost_items"("location_id");

-- CreateIndex
CREATE INDEX "found_items_user_id_idx" ON "found_items"("user_id");

-- CreateIndex
CREATE INDEX "found_items_category_id_idx" ON "found_items"("category_id");

-- CreateIndex
CREATE INDEX "found_items_location_id_idx" ON "found_items"("location_id");

-- CreateIndex
CREATE INDEX "matches_found_id_idx" ON "matches"("found_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_lost_id_found_id_key" ON "matches"("lost_id", "found_id");

-- CreateIndex
CREATE INDEX "claims_found_id_idx" ON "claims"("found_id");

-- CreateIndex
CREATE INDEX "claims_claimant_id_idx" ON "claims"("claimant_id");

-- CreateIndex
CREATE INDEX "claims_verified_by_idx" ON "claims"("verified_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_lost_id_fkey" FOREIGN KEY ("lost_id") REFERENCES "lost_items"("lost_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_found_id_fkey" FOREIGN KEY ("found_id") REFERENCES "found_items"("found_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_found_id_fkey" FOREIGN KEY ("found_id") REFERENCES "found_items"("found_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_id_fkey" FOREIGN KEY ("claimant_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
