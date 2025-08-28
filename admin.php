<?php
session_start();
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<!-- page to be updated -->
<body>
    <header>
        <h1>Admin Dashboard</h1>
        <nav>
            <a href="index.html">Home</a>
            <a href="logout.php">Log Out</a>
        </nav>
    </header>
    <main>
        <p>Welcome, Admin! This is the protected admin dashboard.</p>
        <!-- Place your administrative functionalities here -->
    </main>
    <footer>
        <p>&copy; 2025 Dark Theme Website</p>
    </footer>
</body>
</html> 
