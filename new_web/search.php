<?php
$products = [
    "Диван" => ["Цена" => "100400 руб.", "Описание" => "диван есть диван"],
    "Шкаф" => ["Цена" => "1789 руб.", "Описание" => "шкафчик с предметами быта"],
    "Кровать" => ["Цена" => "9876 руб.", "Описание" => "Кроватка удобная для жизни"]
];

$query = strtolower($_POST['search_q'] ?? '');
$result = [];

foreach ($products as $name => $details) {
    if (strpos(mb_strtolower($name), $query) === 0) {
        $result[$name] = $details;
    }
}

if ($result) {
    foreach ($result as $name => $details) {
        echo "<h2>$name</h2>";
        foreach ($details as $key => $value) {
            echo "<p><b>$key:</b> $value</p>";
        }
    }
} else {
    echo "<p>Ничего не найдено</p>";
}
?>
