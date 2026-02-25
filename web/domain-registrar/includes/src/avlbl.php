<?php
// && ($target_ep === "/etc/hosts" || $target_ep === "/usr/lib/cron/tabs/rishi" || $target_ep === "cj.sh")
// viewable files: cat image, cronjob, Unique id appender, nginx backup
error_reporting(0);

if (isset($_GET["action"]) && $_GET["action"] === "get_domains") {
    header("Content-Type: application/json");
    $domains_avlbl = [
        "super-secure-startup.com",
        "nosebook.com",
        "instakilogram.com",
        "toktik.rot",
        "shatgpt.com",
        "shallowseek.lo",
        "novidia.gpu",
        "banana.mephone",
        "nikey.adi",
        "samnotsung.com",
        "chrome.ram"
    ];

    $domains_unavlbl = [
        "dev-tools-pro.net",
        "my-personal-blog.org",
        "notflix.com",
        "metube.lol",
        "amazon.bez",
        "twitter.x",
        "google.meme",
        "microslop.io"
    ];

    $response = [];

    foreach ($domains_avlbl as $domain) {
        $response[] = [
            "domain" => $domain,
            "status" => "Available",
        ];
    }
    foreach ($domains_unavlbl as $domain) {
        $response[] = [
            "domain" => $domain,
            "status" => "Taken",
        ];
    }   

    echo json_encode($response);
    exit();
}

$target = $_GET["list"];

if (isset($target)) {
    if (strpos($target, "http") !== 0) {
        $allowed_files = ["/etc/hosts", "/etc/crontab"];

        if (in_array($target, $allowed_files)) {
            header("Content-Type: text/plain");
            echo file_get_contents($target);
        } else {
            http_response_code(403);
            echo "sus";
        }
    } else {
        $url_part = parse_url($target);
        $host = $url_part["host"] ?? "";

        if (
            (
                $host === "localhost" ||
                $host === "127.0.0.1" ||
                $host === "0.0.0.0" ||
                filter_var($host, FILTER_VALIDATE_IP)
            )
            && strpos($target, "/ssrf") === false
        ) {
            http_response_code(403);
            die("Error");
        }
        
        $host = $url_part["host"] ?? "";
        $path = $url_part["path"] ?? "/";
        
        $ssrf_url = "http://127.0.0.1/ssrf" . $path;
        
        $opts = [
            "http" => [
                "header" => "Host: $host\r\n"
            ]
        ];
        
        $ctx = stream_context_create($opts);
        
        $content = file_get_contents($ssrf_url, false, $ctx);


        if ($content === false) {
            echo "Error: Could not reach service.";
        } else {
            if (isset($http_response_header)) {
                foreach ($http_response_header as $header) {
                    if (stripos($header, "Content-Type") !== false) {
                        header($header);
                    }
                }
            }
            echo $content;
        }
    }
} else {
    echo "List parameter missing";
}
?>
