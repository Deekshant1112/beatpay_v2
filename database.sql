-- ============================================
-- BeatPay v2 — Live Club Song Bidding System
-- ============================================

CREATE DATABASE IF NOT EXISTS beatpay2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE beatpay2;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  name VARCHAR(100) DEFAULT NULL,
  role ENUM('dj', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile (mobile),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ============================================
-- OTP VERIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile_otp (mobile),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================
-- SONGS
-- ============================================
CREATE TABLE IF NOT EXISTS songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dj_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_songs_dj FOREIGN KEY (dj_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_dj_id (dj_id)
) ENGINE=InnoDB;

-- ============================================
-- BIDDING ROUNDS
-- ============================================
CREATE TABLE IF NOT EXISTS bidding_rounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dj_id INT NOT NULL,
  status ENUM('active', 'closed') NOT NULL DEFAULT 'active',
  duration_seconds INT NOT NULL DEFAULT 60,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  winner_song_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rounds_dj FOREIGN KEY (dj_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rounds_winner FOREIGN KEY (winner_song_id) REFERENCES songs(id) ON DELETE SET NULL,
  INDEX idx_dj_id (dj_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- BIDS
-- ============================================
CREATE TABLE IF NOT EXISTS bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  round_id INT NOT NULL,
  song_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- One bid per user per song per round (update instead of insert)
  UNIQUE KEY uq_user_song_round (round_id, song_id, user_id),
  CONSTRAINT fk_bids_round FOREIGN KEY (round_id) REFERENCES bidding_rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_bids_song FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  CONSTRAINT fk_bids_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_round_id (round_id),
  INDEX idx_song_id (song_id)
) ENGINE=InnoDB;

-- ============================================
-- SEED: Default DJ account (mobile: 9999999999)
-- ============================================
INSERT INTO users (mobile, name, role) VALUES ('9999999999', 'DJ BeatMaster', 'dj');
