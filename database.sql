-- =====================================================================
-- CV BUILDER — database.sql
-- MySQL / MariaDB compatible schema for future backend integration
-- (PHP, Node.js/Express, etc.). The live GitHub Pages site uses
-- localStorage instead; this file is provided for Mode 2 (Database Mode).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cv_builder_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cv_builder_db;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- resumes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  template_name    VARCHAR(60) NOT NULL DEFAULT 'modern',
  profile_photo    LONGTEXT NULL COMMENT 'Base64 image data or a stored file path/URL',
  full_name        VARCHAR(150) NOT NULL,
  phone            VARCHAR(30)  NOT NULL,
  email            VARCHAR(190) NOT NULL,
  location         VARCHAR(150) NOT NULL,
  career_objective TEXT NULL,
  declaration      TEXT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resumes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- education
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS education (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id     INT UNSIGNED NOT NULL,
  degree        VARCHAR(150) NOT NULL,
  school_name   VARCHAR(190) NOT NULL,
  university    VARCHAR(190) NULL,
  year_of_pass  VARCHAR(20)  NULL,
  grade         VARCHAR(30)  NULL,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_education_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id   INT UNSIGNED NOT NULL,
  skill_name  VARCHAR(100) NOT NULL,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_skills_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id    INT UNSIGNED NOT NULL,
  project_name VARCHAR(190) NOT NULL,
  description  TEXT NULL,
  technologies VARCHAR(255) NULL,
  project_link VARCHAR(255) NULL,
  sort_order   INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_projects_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- experience (internship / work experience)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id    INT UNSIGNED NOT NULL,
  company_name VARCHAR(190) NOT NULL,
  job_role     VARCHAR(150) NOT NULL,
  duration     VARCHAR(100) NULL,
  description  TEXT NULL,
  sort_order   INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_experience_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- certifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id         INT UNSIGNED NOT NULL,
  certification_name VARCHAR(190) NOT NULL,
  organization      VARCHAR(190) NULL,
  course_name       VARCHAR(190) NULL,
  year              VARCHAR(20)  NULL,
  sort_order        INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_certifications_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id        INT UNSIGNED NOT NULL,
  achievement_text VARCHAR(255) NOT NULL,
  sort_order       INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_achievements_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- languages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id     INT UNSIGNED NOT NULL,
  language_name VARCHAR(80) NOT NULL,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_languages_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- hobbies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hobbies (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id   INT UNSIGNED NOT NULL,
  hobby_name  VARCHAR(100) NOT NULL,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_hobbies_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- strengths
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strengths (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id      INT UNSIGNED NOT NULL,
  strength_name  VARCHAR(100) NOT NULL,
  sort_order     INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_strengths_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- Sample seed data (optional — safe to delete before production use)
-- =====================================================================
INSERT INTO users (name, email) VALUES
  ('Nishanth Kumar', 'nishanth@example.com');

INSERT INTO resumes (user_id, template_name, full_name, phone, email, location, career_objective, declaration)
VALUES (
  1, 'modern', 'Nishanth Kumar', '+91 98765 43210', 'nishanth@example.com', 'Chennai, Tamil Nadu',
  'A motivated computer science student seeking an entry-level software development role.',
  'I hereby declare that the information given above is true to the best of my knowledge.'
);

INSERT INTO education (resume_id, degree, school_name, university, year_of_pass, grade, sort_order) VALUES
  (1, 'B.E. Computer Science', 'ABC College of Engineering', 'Anna University', '2026', '8.4 CGPA', 0);

INSERT INTO skills (resume_id, skill_name, sort_order) VALUES
  (1, 'HTML', 0), (1, 'CSS', 1), (1, 'JavaScript', 2), (1, 'SQL', 3);
