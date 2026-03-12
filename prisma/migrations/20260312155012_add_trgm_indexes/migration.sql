-- CreateIndex
CREATE INDEX "faculty_first_name_trgm_idx" ON "faculty" USING GIN ("first_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "faculty_last_name_trgm_idx" ON "faculty" USING GIN ("last_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "faculty_primary_email_trgm_idx" ON "faculty" USING GIN ("primary_email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "faculty_secondary_email_trgm_idx" ON "faculty" USING GIN ("secondary_email" gin_trgm_ops);
