require("./static-attachments");

const NativeUI = require("nativeui");
const UIMenu = NativeUI.Menu;
const UIMenuItem = NativeUI.UIMenuItem;
const Point = NativeUI.Point;

const cmdWaitTime = 2000;
const controlsToDisable = [12, 13, 14, 15, 16, 17, 22, 23, 24, 25, 37, 44, 45, 47, 55, 58, 69, 70, 92, 114, 140, 141, 142, 143, 257, 263, 264, 331];
const controlsLength = controlsToDisable.length;

const productNames = {};
let vehicleModels = [];

let isCarrying = false;
let vehicleMenu = null;
let closestVehicleID = -1;
let lastRequestTime = -1;

function findClosestVehicle(maxDistance = 2.0) {
    const vehicles = [];
    mp.vehicles.forEachInStreamRange((vehicle) => {
        if (vehicleModels.includes(vehicle.model)) vehicles.push(vehicle);
    });

    const playerPos = mp.players.local.position;
    let tempMinDist = 9999.0;
    let closestID = -1;

    for (let i = 0, max = vehicles.length; i < max; i++) {
        const vehiclePos = vehicles[i].getWorldPositionOfBone(vehicles[i].getBoneIndexByName("platelight"));
        const dist = mp.game.system.vdist2(playerPos.x, playerPos.y, playerPos.z, vehiclePos.x, vehiclePos.y, vehiclePos.z);
        if (dist > maxDistance) continue;

        if (dist < tempMinDist) {
            tempMinDist = dist;
            closestID = vehicles[i].remoteId;
        }
    }

    return closestID;
}

// Script Events
mp.events.add("registerCourierData", (productData, vehicleData) => {
    for (const item of productData) {
        productNames[item.key] = item.name;
        mp.attachmentMngr.register(`cr_attach_${item.key}`, item.model, 28422, item.offset, item.rotation);
    }

    vehicleModels = vehicleData.map(model => mp.game.joaat(model));
});

mp.events.add("courierSetCarrying", (state) => {
    isCarrying = state;
    mp.players.local.weapon = mp.game.joaat("weapon_unarmed");
});

mp.events.add("courierReceiveInventory", (data) => {
    if (vehicleMenu === null) {
        vehicleMenu = new UIMenu("Vehicle Inventory", "", new Point(950, 300));

        vehicleMenu.ItemSelect.on((item, index) => {
            mp.events.callRemote("courierInteractVehicle", closestVehicleID, isCarrying, index);
            vehicleMenu.Visible = false;
        });

        vehicleMenu.MenuClose.on(() => {
            closestVehicleID = -1;
        });
    } else {
        vehicleMenu.Clear();
    }

    const max = data.length;
    for (let i = 0; i < max; i++) vehicleMenu.AddItem(new UIMenuItem(data[i] ? productNames[ data[i] ] : "Empty", ""));

    if (max > 0) {
        vehicleMenu.Visible = true;
    } else {
        mp.gui.chat.push("No vehicle inventory data received.");
    }
});

// RAGEMP Events
mp.events.add("playerCommand", (command) => {
    if (command.toLowerCase() === "products") {
        if (mp.players.local.vehicle) {
            mp.gui.chat.push("You can't use this command in a vehicle.");
            return;
        }

        closestVehicleID = findClosestVehicle();
        if (closestVehicleID === -1) {
            mp.gui.chat.push("You're not near a courier vehicle.");
            return;
        }

        const now = Date.now();
        if (now - lastRequestTime < cmdWaitTime) {
            mp.gui.chat.push("Wait before using this command again.");
            return;
        }

        lastRequestTime = now;
        mp.events.callRemote("courierRequestInventory", closestVehicleID);
    }
});

mp.events.add("render", () => {
    if (isCarrying) for (let i = 0; i < controlsLength; i++) mp.game.controls.disableControlAction(2, controlsToDisable[i], true);
});