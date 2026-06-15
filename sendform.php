<?php

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    exit("Not a POST method.");
}

$name = trim($_POST["name"] ?? "");
$email = trim($_POST["email"] ?? "");
$message = trim($_POST["message"] ?? "");

if (!$name || !$email || !$message) {
    exit("Заполните все поля");
}

$to = "info@npolp.ru";
$subject = "Запрос от $name ($email).";

$text = "Имя: $name\n";
$text .= "E-mail: $email\n\n";
$text .= "Сообщение:\n$message";

$headers = "From: auto@npolp.ru\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if (mail($to, $subject, $text, $headers)) {
    echo "Спасибо! Ваш запрос отправлен.";
} else {
    echo "Ошибка отправки.";
}