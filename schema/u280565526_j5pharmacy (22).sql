-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 14, 2025 at 01:45 AM
-- Server version: 10.11.10-MariaDB
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u280565526_j5pharmacy`
--

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `branch_id` int(11) NOT NULL,
  `branch_code` varchar(255) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `date_opened` date NOT NULL DEFAULT '2024-01-01',
  `branch_manager` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_archived` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches_archive`
--

CREATE TABLE `branches_archive` (
  `archive_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `branch_code` varchar(255) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `date_opened` date NOT NULL,
  `branch_manager` int(11) DEFAULT NULL,
  `archived_by` int(11) NOT NULL,
  `archive_reason` text NOT NULL,
  `archived_at` timestamp NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branch_code_counter`
--

CREATE TABLE `branch_code_counter` (
  `id` int(11) NOT NULL,
  `counter` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branch_inventory`
--

CREATE TABLE `branch_inventory` (
  `inventory_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `expiryDate` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branch_inventory_archive`
--

CREATE TABLE `branch_inventory_archive` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `expiryDate` date DEFAULT NULL,
  `archived_by` varchar(20) NOT NULL,
  `archive_reason` text NOT NULL,
  `archived_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `branch_inventory_summary`
-- (See below for the actual view)
--
CREATE TABLE `branch_inventory_summary` (
`inventory_id` int(11)
,`branch_id` int(11)
,`branch_name` varchar(100)
,`product_id` int(11)
,`product_name` varchar(255)
,`brand_name` varchar(255)
,`stock` int(11)
,`expiryDate` date
,`createdAt` timestamp
,`updatedAt` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `cash_reconciliation`
--

CREATE TABLE `cash_reconciliation` (
  `reconciliation_id` int(11) NOT NULL,
  `pharmacist_session_id` int(11) NOT NULL,
  `total_transactions` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `cash_counted` decimal(10,2) NOT NULL,
  `balance` decimal(10,2) NOT NULL,
  `denomination_1000` int(11) DEFAULT 0,
  `denomination_500` int(11) DEFAULT 0,
  `denomination_200` int(11) DEFAULT 0,
  `denomination_100` int(11) DEFAULT 0,
  `denomination_50` int(11) DEFAULT 0,
  `denomination_20` int(11) DEFAULT 0,
  `denomination_10` int(11) DEFAULT 0,
  `denomination_5` int(11) DEFAULT 0,
  `denomination_1` int(11) DEFAULT 0,
  `denomination_cents` int(11) DEFAULT 0,
  `status` enum('balanced','shortage','overage') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `prefix` varchar(3) NOT NULL COMMENT 'BARCODE PREFIX CAN ONLY HOLD 3 CHARS',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `category_archive`
--

CREATE TABLE `category_archive` (
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `prefix` varchar(10) NOT NULL,
  `archived_by` int(11) NOT NULL,
  `archived_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `category_barcode_counter`
--

CREATE TABLE `category_barcode_counter` (
  `category_id` int(11) NOT NULL,
  `last_number` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `card_id` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `discount_type` enum('None','Senior','PWD','Employee') DEFAULT 'None',
  `discount_id_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_archived` tinyint(1) DEFAULT 0,
  `archive_reason` text DEFAULT NULL,
  `archived_by` varchar(255) DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `daily_sales_summary`
-- (See below for the actual view)
--
CREATE TABLE `daily_sales_summary` (
`sale_date` date
,`branch_id` int(11)
,`branch_name` varchar(100)
,`total_transactions` bigint(21)
,`total_sales` decimal(32,2)
,`total_discounts` decimal(32,2)
,`unique_customers` bigint(21)
,`total_points_earned` decimal(32,0)
,`total_points_redeemed` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `held_transactions`
--

CREATE TABLE `held_transactions` (
  `id` int(11) NOT NULL,
  `sales_session_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `hold_number` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `held_transaction_items`
--

CREATE TABLE `held_transaction_items` (
  `id` int(11) NOT NULL,
  `held_transaction_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_sequence`
--

CREATE TABLE `invoice_sequence` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `current_number` int(11) NOT NULL DEFAULT 1,
  `year` int(4) NOT NULL,
  `month` int(2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pharmacist`
--

CREATE TABLE `pharmacist` (
  `staff_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `pin_code` char(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image_data` longblob DEFAULT NULL,
  `image_type` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pharmacist_sessions`
--

CREATE TABLE `pharmacist_sessions` (
  `pharmacist_session_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `share_percentage` decimal(5,2) DEFAULT 100.00,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `prescription_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `doctor_name` varchar(100) NOT NULL,
  `doctor_license_number` varchar(50) DEFAULT NULL,
  `prescription_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `image_data` mediumblob DEFAULT NULL,
  `image_type` enum('JPEG','PNG','PDF') DEFAULT 'JPEG',
  `image_upload_date` timestamp NULL DEFAULT NULL,
  `status` enum('ACTIVE','USED','EXPIRED') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescription_items`
--

CREATE TABLE `prescription_items` (
  `item_id` int(11) NOT NULL,
  `prescription_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `prescribed_quantity` int(11) NOT NULL,
  `dispensed_quantity` int(11) DEFAULT 0,
  `dosage_instructions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `price_history`
--

CREATE TABLE `price_history` (
  `history_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_supplier_id` int(11) NOT NULL,
  `supplier_price` decimal(10,2) NOT NULL,
  `ceiling_price` decimal(10,2) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `markup_percentage` decimal(5,2) DEFAULT NULL,
  `effective_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand_name` varchar(255) NOT NULL,
  `category` int(11) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `sideEffects` text DEFAULT NULL,
  `dosage_amount` decimal(10,2) DEFAULT NULL,
  `dosage_unit` enum('mg','mcg','g','kg','ml','l','tablet','capsule','pill','patch','spray','drop','mg/ml','mcg/ml','mg/l','mcg/l','mg/g','mcg/g','IU','mEq','mmol','unit','puff','application','sachet','suppository','ampoule','vial','syringe','piece') DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `pieces_per_box` int(11) NOT NULL,
  `critical` int(11) NOT NULL,
  `requiresPrescription` tinyint(1) NOT NULL,
  `expiryDate` datetime DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `current_supplier_id` int(11) DEFAULT NULL,
  `markup_percentage` decimal(5,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products_archive`
--

CREATE TABLE `products_archive` (
  `archive_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `barcode` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `brand_name` varchar(255) DEFAULT NULL,
  `category` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `sideEffects` text DEFAULT NULL,
  `dosage_amount` decimal(10,2) DEFAULT NULL,
  `dosage_unit` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `pieces_per_box` int(11) DEFAULT NULL,
  `critical` int(11) DEFAULT NULL,
  `requiresPrescription` tinyint(1) DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `archived_by` int(11) NOT NULL,
  `archive_reason` text NOT NULL,
  `archived_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `product_sales_analysis`
-- (See below for the actual view)
--
CREATE TABLE `product_sales_analysis` (
`product_id` int(11)
,`product_name` varchar(255)
,`category_name` varchar(255)
,`branch_id` int(11)
,`branch_name` varchar(100)
,`times_sold` bigint(21)
,`total_quantity_sold` decimal(32,0)
,`total_revenue` decimal(32,2)
,`average_price` decimal(14,6)
);

-- --------------------------------------------------------

--
-- Table structure for table `product_suppliers`
--

CREATE TABLE `product_suppliers` (
  `product_supplier_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `supplier_price` decimal(10,2) NOT NULL,
  `is_preferred` tinyint(1) DEFAULT 0,
  `ceiling_price` decimal(10,2) DEFAULT NULL,
  `last_supply_date` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `product_total_stock`
-- (See below for the actual view)
--
CREATE TABLE `product_total_stock` (
`product_id` int(11)
,`total_stock` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `returns_analysis`
-- (See below for the actual view)
--
CREATE TABLE `returns_analysis` (
`return_date` date
,`branch_id` int(11)
,`branch_name` varchar(100)
,`total_returns` bigint(21)
,`total_return_amount` decimal(32,2)
,`reason` text
,`processed_by_name` varchar(100)
);

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `pharmacist_session_id` int(11) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `discount_type` enum('None','Senior','PWD','Employee','Points') DEFAULT 'None',
  `discount_id_number` varchar(50) DEFAULT NULL,
  `payment_method` enum('cash','card','gcash','maya') NOT NULL,
  `payment_status` enum('paid','pending','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `points_earned` int(11) DEFAULT 0,
  `points_redeemed` int(11) DEFAULT 0,
  `branch_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `daily_sequence` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `sales`
--
DELIMITER $$
CREATE TRIGGER `sales_before_insert` BEFORE INSERT ON `sales` FOR EACH ROW BEGIN
  SET NEW.daily_sequence = (
    SELECT COALESCE(MAX(daily_sequence), 0) + 1
    FROM sales
    WHERE branch_id = NEW.branch_id
    AND DATE(created_at) = DATE(NEW.created_at)
  );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `sales_payments`
--

CREATE TABLE `sales_payments` (
  `payment_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `payment_method` enum('cash','card','gcash','maya') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_returns`
--

CREATE TABLE `sales_returns` (
  `return_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` text NOT NULL,
  `refund_amount` decimal(10,2) NOT NULL,
  `pharmacist_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_sessions`
--

CREATE TABLE `sales_sessions` (
  `session_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `total_sales` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `SKU` enum('Piece','Box') NOT NULL,
  `prescription_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `star_points`
--

CREATE TABLE `star_points` (
  `star_points_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `points_balance` int(11) NOT NULL DEFAULT 0,
  `total_points_earned` int(11) NOT NULL DEFAULT 0,
  `total_points_redeemed` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `star_points_transactions`
--

CREATE TABLE `star_points_transactions` (
  `transaction_id` int(11) NOT NULL,
  `star_points_id` int(11) NOT NULL,
  `points_amount` int(11) NOT NULL,
  `transaction_type` enum('EARNED','REDEEMED') NOT NULL,
  `reference_transaction_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `test_accounts`
--

CREATE TABLE `test_accounts` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `remarks` varchar(255) NOT NULL,
  `role` enum('ADMIN','MANAGER','PHARMACIST') NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `hired_at` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `image_data` longblob DEFAULT NULL,
  `image_type` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure for view `branch_inventory_summary`
--
DROP TABLE IF EXISTS `branch_inventory_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u280565526_j5admin`@`127.0.0.1` SQL SECURITY DEFINER VIEW `branch_inventory_summary`  AS SELECT `bi`.`inventory_id` AS `inventory_id`, `bi`.`branch_id` AS `branch_id`, `b`.`branch_name` AS `branch_name`, `bi`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`brand_name` AS `brand_name`, `bi`.`stock` AS `stock`, `bi`.`expiryDate` AS `expiryDate`, `bi`.`createdAt` AS `createdAt`, `bi`.`updatedAt` AS `updatedAt` FROM ((`branch_inventory` `bi` join `branches` `b` on(`bi`.`branch_id` = `b`.`branch_id`)) join `products` `p` on(`bi`.`product_id` = `p`.`id`)) WHERE `bi`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `daily_sales_summary`
--
DROP TABLE IF EXISTS `daily_sales_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u280565526_j5admin`@`127.0.0.1` SQL SECURITY DEFINER VIEW `daily_sales_summary`  AS SELECT cast(convert_tz(`s`.`created_at`,'+00:00','+08:00') as date) AS `sale_date`, `s`.`branch_id` AS `branch_id`, `b`.`branch_name` AS `branch_name`, count(distinct `s`.`id`) AS `total_transactions`, sum(`s`.`total_amount`) AS `total_sales`, sum(`s`.`discount_amount`) AS `total_discounts`, count(distinct `s`.`customer_id`) AS `unique_customers`, sum(`s`.`points_earned`) AS `total_points_earned`, sum(`s`.`points_redeemed`) AS `total_points_redeemed` FROM (`sales` `s` left join `branches` `b` on(`s`.`branch_id` = `b`.`branch_id`)) WHERE `s`.`payment_status` = 'paid' GROUP BY cast(convert_tz(`s`.`created_at`,'+00:00','+08:00') as date), `s`.`branch_id`, `b`.`branch_name` ;

-- --------------------------------------------------------

--
-- Structure for view `product_sales_analysis`
--
DROP TABLE IF EXISTS `product_sales_analysis`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u280565526_j5admin`@`127.0.0.1` SQL SECURITY DEFINER VIEW `product_sales_analysis`  AS SELECT `p`.`id` AS `product_id`, `p`.`name` AS `product_name`, `c`.`name` AS `category_name`, `s`.`branch_id` AS `branch_id`, `b`.`branch_name` AS `branch_name`, count(distinct `s`.`id`) AS `times_sold`, sum(`si`.`quantity`) AS `total_quantity_sold`, sum(`si`.`total_price`) AS `total_revenue`, avg(`si`.`unit_price`) AS `average_price` FROM ((((`sale_items` `si` join `sales` `s` on(`si`.`sale_id` = `s`.`id`)) join `products` `p` on(`si`.`product_id` = `p`.`id`)) join `category` `c` on(`p`.`category` = `c`.`category_id`)) join `branches` `b` on(`s`.`branch_id` = `b`.`branch_id`)) WHERE `s`.`payment_status` = 'paid' GROUP BY `p`.`id`, `p`.`name`, `c`.`name`, `s`.`branch_id`, `b`.`branch_name` ;

-- --------------------------------------------------------

--
-- Structure for view `product_total_stock`
--
DROP TABLE IF EXISTS `product_total_stock`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u280565526_j5admin`@`127.0.0.1` SQL SECURITY DEFINER VIEW `product_total_stock`  AS SELECT `p`.`id` AS `product_id`, coalesce(sum(`bi`.`stock`),0) AS `total_stock` FROM (`products` `p` left join `branch_inventory` `bi` on(`p`.`id` = `bi`.`product_id` and `bi`.`is_active` = 1)) GROUP BY `p`.`id` ;

-- --------------------------------------------------------

--
-- Structure for view `returns_analysis`
--
DROP TABLE IF EXISTS `returns_analysis`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u280565526_j5admin`@`127.0.0.1` SQL SECURITY DEFINER VIEW `returns_analysis`  AS SELECT cast(convert_tz(`sr`.`created_at`,'+00:00','+08:00') as date) AS `return_date`, `s`.`branch_id` AS `branch_id`, `b`.`branch_name` AS `branch_name`, count(`sr`.`return_id`) AS `total_returns`, sum(`sr`.`refund_amount`) AS `total_return_amount`, `sr`.`reason` AS `reason`, `p`.`name` AS `processed_by_name` FROM (((`sales_returns` `sr` join `sales` `s` on(`sr`.`sale_id` = `s`.`id`)) join `branches` `b` on(`s`.`branch_id` = `b`.`branch_id`)) join `pharmacist` `p` on(`sr`.`pharmacist_id` = `p`.`staff_id`)) GROUP BY cast(convert_tz(`sr`.`created_at`,'+00:00','+08:00') as date), `s`.`branch_id`, `b`.`branch_name`, `sr`.`reason`, `p`.`name` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`branch_id`),
  ADD KEY `fk_branch_manager` (`branch_manager`);

--
-- Indexes for table `branches_archive`
--
ALTER TABLE `branches_archive`
  ADD PRIMARY KEY (`archive_id`),
  ADD KEY `fk_archived_branch` (`branch_id`),
  ADD KEY `fk_archive_manager` (`branch_manager`),
  ADD KEY `fk_archived_by` (`archived_by`);

--
-- Indexes for table `branch_code_counter`
--
ALTER TABLE `branch_code_counter`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `branch_inventory`
--
ALTER TABLE `branch_inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `idx_branch_product` (`branch_id`,`product_id`);

--
-- Indexes for table `branch_inventory_archive`
--
ALTER TABLE `branch_inventory_archive`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_branch_inventory_archive_product` (`product_id`),
  ADD KEY `idx_branch_inventory_archive_branch` (`branch_id`),
  ADD KEY `idx_branch_inventory_archive_archived_by` (`archived_by`);

--
-- Indexes for table `cash_reconciliation`
--
ALTER TABLE `cash_reconciliation`
  ADD PRIMARY KEY (`reconciliation_id`),
  ADD KEY `pharmacist_session_id` (`pharmacist_session_id`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `category_archive`
--
ALTER TABLE `category_archive`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `archived_by` (`archived_by`);

--
-- Indexes for table `category_barcode_counter`
--
ALTER TABLE `category_barcode_counter`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `card_id` (`card_id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_is_archived` (`is_archived`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_card_id` (`card_id`);

--
-- Indexes for table `held_transactions`
--
ALTER TABLE `held_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sales_session_id` (`sales_session_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `held_transaction_items`
--
ALTER TABLE `held_transaction_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `held_transaction_id` (`held_transaction_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `invoice_sequence`
--
ALTER TABLE `invoice_sequence`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `branch_year_month_unique` (`branch_id`,`year`,`month`);

--
-- Indexes for table `pharmacist`
--
ALTER TABLE `pharmacist`
  ADD PRIMARY KEY (`staff_id`),
  ADD UNIQUE KEY `pin_code` (`pin_code`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_pin_code` (`pin_code`),
  ADD KEY `idx_branch_id` (`branch_id`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `pharmacist_sessions`
--
ALTER TABLE `pharmacist_sessions`
  ADD PRIMARY KEY (`pharmacist_session_id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `staff_id` (`staff_id`) USING BTREE;

--
-- Indexes for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`prescription_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `prescription_items`
--
ALTER TABLE `prescription_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `prescription_id` (`prescription_id`);

--
-- Indexes for table `price_history`
--
ALTER TABLE `price_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_supplier_id` (`product_supplier_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `barcode` (`barcode`),
  ADD KEY `category` (`category`),
  ADD KEY `current_supplier_id` (`current_supplier_id`);

--
-- Indexes for table `products_archive`
--
ALTER TABLE `products_archive`
  ADD PRIMARY KEY (`archive_id`),
  ADD KEY `category` (`category`),
  ADD KEY `idx_products_archive_product` (`product_id`),
  ADD KEY `idx_products_archive_barcode` (`barcode`),
  ADD KEY `idx_products_archive_name` (`name`),
  ADD KEY `idx_products_archive_archived_by` (`archived_by`),
  ADD KEY `idx_products_archive_archived_at` (`archived_at`);

--
-- Indexes for table `product_suppliers`
--
ALTER TABLE `product_suppliers`
  ADD PRIMARY KEY (`product_supplier_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `pharmacist_session_id` (`pharmacist_session_id`),
  ADD KEY `idx_invoice_number` (`invoice_number`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_branch_customer` (`branch_id`,`customer_id`),
  ADD KEY `idx_sales_date_branch` (`created_at`,`branch_id`),
  ADD KEY `idx_sales_payment` (`payment_method`,`payment_status`),
  ADD KEY `idx_sales_customer` (`customer_id`,`discount_type`);

--
-- Indexes for table `sales_payments`
--
ALTER TABLE `sales_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `sale_id` (`sale_id`);

--
-- Indexes for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD PRIMARY KEY (`return_id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `pharmacist_id` (`pharmacist_id`),
  ADD KEY `idx_returns_date` (`created_at`,`sale_id`);

--
-- Indexes for table `sales_sessions`
--
ALTER TABLE `sales_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `prescription_id` (`prescription_id`),
  ADD KEY `idx_sale_product` (`sale_id`,`product_id`),
  ADD KEY `idx_sale_items_product` (`product_id`,`created_at`);

--
-- Indexes for table `star_points`
--
ALTER TABLE `star_points`
  ADD PRIMARY KEY (`star_points_id`),
  ADD UNIQUE KEY `customer_id` (`customer_id`);

--
-- Indexes for table `star_points_transactions`
--
ALTER TABLE `star_points_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `star_points_id` (`star_points_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `test_accounts`
--
ALTER TABLE `test_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `branch_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branches_archive`
--
ALTER TABLE `branches_archive`
  MODIFY `archive_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branch_code_counter`
--
ALTER TABLE `branch_code_counter`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branch_inventory`
--
ALTER TABLE `branch_inventory`
  MODIFY `inventory_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branch_inventory_archive`
--
ALTER TABLE `branch_inventory_archive`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_reconciliation`
--
ALTER TABLE `cash_reconciliation`
  MODIFY `reconciliation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `held_transactions`
--
ALTER TABLE `held_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `held_transaction_items`
--
ALTER TABLE `held_transaction_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_sequence`
--
ALTER TABLE `invoice_sequence`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pharmacist`
--
ALTER TABLE `pharmacist`
  MODIFY `staff_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pharmacist_sessions`
--
ALTER TABLE `pharmacist_sessions`
  MODIFY `pharmacist_session_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prescriptions`
--
ALTER TABLE `prescriptions`
  MODIFY `prescription_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prescription_items`
--
ALTER TABLE `prescription_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `price_history`
--
ALTER TABLE `price_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products_archive`
--
ALTER TABLE `products_archive`
  MODIFY `archive_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_suppliers`
--
ALTER TABLE `product_suppliers`
  MODIFY `product_supplier_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_payments`
--
ALTER TABLE `sales_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `return_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_sessions`
--
ALTER TABLE `sales_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `star_points`
--
ALTER TABLE `star_points`
  MODIFY `star_points_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `star_points_transactions`
--
ALTER TABLE `star_points_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `fk_branch_manager` FOREIGN KEY (`branch_manager`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `branches_archive`
--
ALTER TABLE `branches_archive`
  ADD CONSTRAINT `fk_archive_manager` FOREIGN KEY (`branch_manager`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_archived_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_archived_by` FOREIGN KEY (`archived_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `branch_inventory`
--
ALTER TABLE `branch_inventory`
  ADD CONSTRAINT `branch_inventory_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `branch_inventory_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `branch_inventory_archive`
--
ALTER TABLE `branch_inventory_archive`
  ADD CONSTRAINT `branch_inventory_archive_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `branch_inventory_archive_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `branch_inventory_archive_ibfk_3` FOREIGN KEY (`archived_by`) REFERENCES `users` (`employee_id`);

--
-- Constraints for table `cash_reconciliation`
--
ALTER TABLE `cash_reconciliation`
  ADD CONSTRAINT `cash_reconciliation_ibfk_1` FOREIGN KEY (`pharmacist_session_id`) REFERENCES `pharmacist_sessions` (`pharmacist_session_id`);

--
-- Constraints for table `category_archive`
--
ALTER TABLE `category_archive`
  ADD CONSTRAINT `category_archive_ibfk_1` FOREIGN KEY (`archived_by`) REFERENCES `users` (`user_id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `category_barcode_counter`
--
ALTER TABLE `category_barcode_counter`
  ADD CONSTRAINT `category_barcode_counter_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`);

--
-- Constraints for table `held_transactions`
--
ALTER TABLE `held_transactions`
  ADD CONSTRAINT `held_transactions_branch_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `held_transactions_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `held_transactions_sales_session_fk` FOREIGN KEY (`sales_session_id`) REFERENCES `sales_sessions` (`session_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `held_transaction_items`
--
ALTER TABLE `held_transaction_items`
  ADD CONSTRAINT `held_transaction_items_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `held_transaction_items_transaction_fk` FOREIGN KEY (`held_transaction_id`) REFERENCES `held_transactions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoice_sequence`
--
ALTER TABLE `invoice_sequence`
  ADD CONSTRAINT `invoice_sequence_branch_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pharmacist`
--
ALTER TABLE `pharmacist`
  ADD CONSTRAINT `pharmacist_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);

--
-- Constraints for table `pharmacist_sessions`
--
ALTER TABLE `pharmacist_sessions`
  ADD CONSTRAINT `pharmacist_sessions_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sales_sessions` (`session_id`),
  ADD CONSTRAINT `pharmacist_sessions_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `pharmacist` (`staff_id`);

--
-- Constraints for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`);

--
-- Constraints for table `prescription_items`
--
ALTER TABLE `prescription_items`
  ADD CONSTRAINT `prescription_items_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`);

--
-- Constraints for table `price_history`
--
ALTER TABLE `price_history`
  ADD CONSTRAINT `price_history_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `price_history_ibfk_2` FOREIGN KEY (`product_supplier_id`) REFERENCES `product_suppliers` (`product_supplier_id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`current_supplier_id`) REFERENCES `suppliers` (`supplier_id`);

--
-- Constraints for table `products_archive`
--
ALTER TABLE `products_archive`
  ADD CONSTRAINT `products_archive_ibfk_1` FOREIGN KEY (`category`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `products_archive_ibfk_2` FOREIGN KEY (`archived_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `products_archive_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `product_suppliers`
--
ALTER TABLE `product_suppliers`
  ADD CONSTRAINT `product_suppliers_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `product_suppliers_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`);

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`pharmacist_session_id`) REFERENCES `pharmacist_sessions` (`pharmacist_session_id`),
  ADD CONSTRAINT `sales_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);

--
-- Constraints for table `sales_payments`
--
ALTER TABLE `sales_payments`
  ADD CONSTRAINT `sales_payments_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`);

--
-- Constraints for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD CONSTRAINT `sales_returns_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  ADD CONSTRAINT `sales_returns_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `sales_returns_ibfk_3` FOREIGN KEY (`pharmacist_id`) REFERENCES `pharmacist` (`staff_id`);

--
-- Constraints for table `sales_sessions`
--
ALTER TABLE `sales_sessions`
  ADD CONSTRAINT `sales_sessions_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  ADD CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `sale_items_ibfk_3` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`);

--
-- Constraints for table `star_points`
--
ALTER TABLE `star_points`
  ADD CONSTRAINT `star_points_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`);

--
-- Constraints for table `star_points_transactions`
--
ALTER TABLE `star_points_transactions`
  ADD CONSTRAINT `star_points_transactions_ibfk_1` FOREIGN KEY (`star_points_id`) REFERENCES `star_points` (`star_points_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
