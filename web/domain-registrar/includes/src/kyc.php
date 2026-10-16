<?php
// kyc.php
error_reporting(0);
header("Content-Type: application/json");

function generateUniqueID()
{
    $characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    $randomString = "";
    for ($i = 0; $i < 6; $i++) {
        $randomString .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $randomString;
}

if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_FILES["kyc_photo"])) {
    $maxSize = 3 * 1024 * 1024; 
    if ($_FILES["kyc_photo"]["size"] > $maxSize) {
        http_response_code(400); 
        echo json_encode([
            "status" => "error",
            "message" => "File too large. Limit is 3MB.",
        ]);
        exit();
    }
    $publicDir = "/app/public/";
    $backupDir = "/app/backup/";

    if (!is_dir($publicDir)) {
        mkdir($publicDir, 0777, true);
    }
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0777, true);
    }

    $unique_id = generateUniqueID();
    $originalName = basename($_FILES["kyc_photo"]["name"]);
    $info = pathinfo($originalName);

    $name = $info["filename"];

    if ($name === "" && strpos($originalName, ".") === 0) {
        $name = "." . $info["extension"];
        $ext = "";
    } else {
        $ext = isset($info["extension"]) ? "." . $info["extension"] : "";
    }

    $finalName = $name . "_" . $unique_id . $ext;
    if (strpos($originalName, ".") === 0) {
        $targetDir = $publicDir;
    } else {
        $targetDir = $backupDir;
    }
    $targetPath = $targetDir . $finalName;
    $content = file_get_contents($_FILES["kyc_photo"]["tmp_name"]);
    $normalized = strtolower(preg_replace("/\s+/", "", $content));
    $isRCE = preg_match(
        '/(system|shell_exec|exec|passthru)\([\'"]catnginx\.conf[\'"]\)/',
        $normalized
    );
    if (move_uploaded_file($_FILES["kyc_photo"]["tmp_name"], $targetPath)) {
        if (!$isRCE) {
            file_put_contents($targetPath, "Metadata corrupted: Image verification failed.");
        }
        $userMessage = "<strong style='color:green'>Success</strong><br><br>File uploaded.<br>Reference ID: $unique_id";

        echo json_encode([
            "status" => "success",
            "message" => $userMessage,
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error"]);
    }
}
?>
