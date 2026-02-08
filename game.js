const mapElement = document.getElementById("map");
const statusElement = document.getElementById("playerStatus");
const inventoryElement = document.getElementById("inventoryList");
const eventLog = document.getElementById("eventLog");
const respawnButton = document.getElementById("respawnMobs");

const mapSize = 10;
const baseExpPerLevel = 10;

const player = {
  x: 1,
  y: 1,
  level: 1,
  exp: 0,
  hp: 100,
  attack: 6,
  defense: 0,
  armor: null,
};

const inventory = [];
let mobs = [];
let loot = [];

const lootTable = [
  { name: "Túnica de Aprendiz", defense: 2 },
  { name: "Colete de Caçador", defense: 3 },
  { name: "Armadura de Couro", defense: 4 },
];

function logEvent(message) {
  const entry = document.createElement("div");
  entry.className = "event-log__item";
  entry.textContent = message;
  eventLog.prepend(entry);
}

function buildMap() {
  mapElement.innerHTML = "";
  for (let y = 0; y < mapSize; y += 1) {
    for (let x = 0; x < mapSize; x += 1) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.x = x;
      tile.dataset.y = y;
      mapElement.appendChild(tile);
    }
  }
}

function respawnMobs() {
  mobs = [
    { id: "lobo", name: "Lobo Cinzento", x: 6, y: 2, hp: 18, exp: 6 },
    { id: "javali", name: "Javali Selvagem", x: 3, y: 7, hp: 22, exp: 7 },
    { id: "soldado", name: "Soldado Desgarrado", x: 8, y: 6, hp: 26, exp: 9 },
  ];
  loot = [];
  logEvent("Os mobs retornaram ao campo de treino.");
  render();
}

function getTile(x, y) {
  return mapElement.querySelector(`[data-x="${x}"][data-y="${y}"]`);
}

function render() {
  mapElement.querySelectorAll(".tile").forEach((tile) => {
    tile.classList.remove("tile--player", "tile--mob", "tile--loot");
  });

  const playerTile = getTile(player.x, player.y);
  if (playerTile) playerTile.classList.add("tile--player");

  mobs.forEach((mob) => {
    const tile = getTile(mob.x, mob.y);
    if (tile) tile.classList.add("tile--mob");
  });

  loot.forEach((drop) => {
    const tile = getTile(drop.x, drop.y);
    if (tile) tile.classList.add("tile--loot");
  });

  statusElement.innerHTML = `
    <div class="status-item"><strong>Nível</strong>${player.level}</div>
    <div class="status-item"><strong>EXP</strong>${player.exp} / ${player.level * baseExpPerLevel}</div>
    <div class="status-item"><strong>HP</strong>${player.hp}</div>
    <div class="status-item"><strong>Ataque</strong>${player.attack}</div>
    <div class="status-item"><strong>Defesa</strong>${player.defense}</div>
    <div class="status-item"><strong>Armadura</strong>${player.armor ? player.armor.name : "Nenhuma"}</div>
  `;

  inventoryElement.innerHTML = "";
  if (inventory.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhum item encontrado ainda.";
    empty.className = "inventory-item";
    inventoryElement.appendChild(empty);
  } else {
    inventory.forEach((item) => {
      const entry = document.createElement("li");
      entry.className = "inventory-item";
      entry.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <div>Defesa +${item.defense}</div>
        </div>
        <button type="button" data-item="${item.name}">Equipar</button>
      `;
      inventoryElement.appendChild(entry);
    });
  }
}

function gainExp(amount) {
  player.exp += amount;
  const threshold = player.level * baseExpPerLevel;
  if (player.exp >= threshold) {
    player.level += 1;
    player.exp -= threshold;
    player.hp += 12;
    player.attack += 2;
    logEvent(`Você subiu para o nível ${player.level}!`);
  }
}

function movePlayer(dx, dy) {
  const targetX = player.x + dx;
  const targetY = player.y + dy;
  if (targetX < 0 || targetY < 0 || targetX >= mapSize || targetY >= mapSize) {
    logEvent("Você encontrou o limite do mapa.");
    return;
  }

  const blockedMob = mobs.find((mob) => mob.x === targetX && mob.y === targetY);
  if (blockedMob) {
    logEvent(`${blockedMob.name} bloqueia o caminho. Use ataque.`);
    return;
  }

  player.x = targetX;
  player.y = targetY;
  render();
}

function attackMob() {
  const target = mobs.find(
    (mob) => Math.abs(mob.x - player.x) + Math.abs(mob.y - player.y) === 1
  );
  if (!target) {
    logEvent("Nenhum mob por perto para atacar.");
    return;
  }

  const damage = Math.max(2, player.attack - 1);
  target.hp -= damage;
  logEvent(`Você atacou ${target.name} e causou ${damage} de dano.`);

  if (target.hp <= 0) {
    mobs = mobs.filter((mob) => mob !== target);
    gainExp(target.exp);
    const dropChance = Math.random();
    if (dropChance > 0.4) {
      const item = lootTable[Math.floor(Math.random() * lootTable.length)];
      loot.push({ ...item, x: target.x, y: target.y });
      logEvent(`${target.name} deixou cair ${item.name}.`);
    } else {
      logEvent(`${target.name} foi derrotado.`);
    }
  }

  render();
}

function pickupLoot() {
  const dropIndex = loot.findIndex((drop) => drop.x === player.x && drop.y === player.y);
  if (dropIndex === -1) {
    logEvent("Não há itens para pegar aqui.");
    return;
  }
  const [item] = loot.splice(dropIndex, 1);
  inventory.push(item);
  logEvent(`Você pegou ${item.name}.`);
  render();
}

function equipItem(name) {
  const item = inventory.find((entry) => entry.name === name);
  if (!item) return;
  player.armor = item;
  player.defense = item.defense;
  logEvent(`${item.name} equipado. Defesa total: ${player.defense}.`);
  render();
}

function handleKeydown(event) {
  switch (event.key.toLowerCase()) {
    case "arrowup":
    case "w":
      movePlayer(0, -1);
      break;
    case "arrowdown":
    case "s":
      movePlayer(0, 1);
      break;
    case "arrowleft":
    case "a":
      movePlayer(-1, 0);
      break;
    case "arrowright":
    case "d":
      movePlayer(1, 0);
      break;
    case "e":
      attackMob();
      break;
    case "f":
      pickupLoot();
      break;
    default:
      break;
  }
}

inventoryElement.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  equipItem(button.dataset.item);
});

respawnButton.addEventListener("click", respawnMobs);
window.addEventListener("keydown", handleKeydown);

buildMap();
respawnMobs();
render();
