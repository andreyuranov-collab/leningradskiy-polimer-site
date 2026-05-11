function showFormMessage() {
  const message = document.getElementById("form-message");
  message.textContent = "Форма пока в тестовом режиме. На следующем этапе подключим отправку заявки.";
}

function toggleMenu(forceState) {
  const menu = document.getElementById("mobile-nav");
  if (!menu) return;
  if (typeof forceState === "boolean") {
    menu.classList.toggle("is-open", forceState);
    return;
  }
  menu.classList.toggle("is-open");
}
