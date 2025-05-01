let keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false  // Adicionando a tecla shift para detectar corrida
};

function keyDownHandler(event) {
  const pressedKey = event.key.toLowerCase();
  if (pressedKey == "w") {
    keys.w = true;
  } else if (pressedKey == "a") {
    keys.a = true;
  } else if (pressedKey == "s") {
    keys.s = true;
  } else if (pressedKey == "d") {
    keys.d = true;
  } else if (pressedKey == "shift") {
    keys.shift = true;  // Detectando quando o shift é pressionado
  } else if (pressedKey == "tab") {
    event.preventDefault();
  } else if (pressedKey == " ") {
    if (!playerManager.mainPlayer.canShoot || playerManager.mainPlayer.isRespawning) return;
    playerManager.mainPlayer.shoot();
  }
}

function keyUpHandler(event) {
  const pressedKey = event.key.toLowerCase();
  if (pressedKey == "w") {
    keys.w = false;
  } else if (pressedKey == "a") {
    keys.a = false;
  } else if (pressedKey == "s") {
    keys.s = false;
  } else if (pressedKey == "d") {
    keys.d = false;
  } else if (pressedKey == "shift") {
    keys.shift = false;  // Detectando quando o shift é liberado
  }
}

function onBlurHandler() {
  keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false  // Resetando shift também
  };
}

function keyEvents() {
  if (playerManager.mainPlayer.isRespawning) return;

  // Calculando o multiplicador de velocidade baseado na tecla shift
  const speedMultiplier = keys.shift ? 1.8 : 1.0;  // 80% mais rápido ao correr
  const currentSpeed = Constants.SPEED * speedMultiplier;
  
  // Ajustando a velocidade diagonal para manter consistência de movimento
  const diagonalSpeed = currentSpeed / 1.25;

  if (keys.w && keys.d) {
    playerManager.mainPlayer.move(diagonalSpeed, -diagonalSpeed, 45, keys.shift);
  } else if (keys.w && keys.a) {
    playerManager.mainPlayer.move(-diagonalSpeed, -diagonalSpeed, 135, keys.shift);
  } else if (keys.s && keys.d) {
    playerManager.mainPlayer.move(diagonalSpeed, diagonalSpeed, -45, keys.shift);
  } else if (keys.s && keys.a) {
    playerManager.mainPlayer.move(-diagonalSpeed, diagonalSpeed, -315, keys.shift);
  } else if (keys.w) {
    playerManager.mainPlayer.move(null, -currentSpeed, 0, keys.shift);
  } else if (keys.a) {
    playerManager.mainPlayer.move(-currentSpeed, null, 90, keys.shift);
  } else if (keys.s) {
    playerManager.mainPlayer.move(null, currentSpeed, 0, keys.shift);
  } else if (keys.d) {
    playerManager.mainPlayer.move(currentSpeed, null, 90, keys.shift);
  }
}
