document.getElementById("contact-form").addEventListener("submit", function(e) {
    e.preventDefault();

    const form = this;
    const data = new FormData(form);

    fetch("sendform.php", {
        method: "POST",
        body: data
    })
    .then(response => response.text())
    .then(result => {
        alert(result);
        form.reset();
    })
    .catch(error => {
        alert("Ошибка отправки. Попробуйте позже.");
        console.error(error);
    });
});