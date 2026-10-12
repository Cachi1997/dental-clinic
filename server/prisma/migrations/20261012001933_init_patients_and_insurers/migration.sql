-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('DNI', 'PASSPORT', 'LIBRETA');

-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_number" TEXT NOT NULL,
    "birth_date" DATE,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "insurance_plan_id" INTEGER,
    "member_number" TEXT,
    "guardian" TEXT,
    "alert" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_plans" (
    "id" SERIAL NOT NULL,
    "insurer_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "has_agreement" BOOLEAN NOT NULL DEFAULT false,
    "agreement_since" DATE,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "insurers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_document_number_idx" ON "patients"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "patients_document_type_document_number_key" ON "patients"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_plans_insurer_id_code_key" ON "insurance_plans"("insurer_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "insurers_name_key" ON "insurers"("name");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_insurance_plan_id_fkey" FOREIGN KEY ("insurance_plan_id") REFERENCES "insurance_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_plans" ADD CONSTRAINT "insurance_plans_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint: a patient with an insurance plan must have a member number
ALTER TABLE "patients" ADD CONSTRAINT "patients_member_number_required_check" CHECK ("insurance_plan_id" IS NULL OR "member_number" IS NOT NULL);