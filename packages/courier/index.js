const fs = require("fs");
const path = require("path");
const util = require("./util");

// Classes
const DroppedProduct = require("./classes/DroppedProduct");
const Business = require("./classes/Business");

// Script data
const config = require("./json/config");
const productData = require("./json/products");
const vehicleLimits = require("./json/vehicles");

// Clientside data
const clientModelList = Object.keys(vehicleLimits);
const clientData = Object.entries(productData).map(([key, value]) => {
    return {
        key: key,
        name: value.name,
        model: value.model,
        offset: value.attachOffset,
        rotation: value.attachRotation
    };
});

// Replace all model names with their hashes
for (const [key, value] of Object.entries(vehicleLimits)) {
    vehicleLimits[ mp.joaat(key) ] = value;
    delete vehicleLimits[key];
}

// Businesses
const businesses = {};
const businessData = require("./json/businesses");
const validTypes = Object.keys(require("./json/businessTypes"));
const validColShapeTypes = ["product", ...validTypes];

// Load businesses
for (const business of businessData) {
    if (!validTypes.includes(business.type)) {
        console.log(`[COURIER] Invalid business type (${business.type}), skipping it. Valid types: ${validTypes.join(", ")}`);
        continue;
    }

    if (typeof productData[business.productType] === "undefined") {
        console.log(`[COURIER] Invalid business product type (${business.productType}), skipping it. Valid types: ${Object.keys(productData).join(", ")}`);
        continue;
    }

    if (business.maxStock < 1) business.maxStock = 1;
    business.initialStock = util.clamp(business.initialStock, 0, business.maxStock);

    const UUID = util.UUID();
    businesses[UUID] = new Business(UUID, business.type, business.productType, business.initialStock, business.maxStock, new mp.Vector3(business.position.x, business.position.y, business.position.z));
}

function doBusinessWork() {
    const now = Date.now();

    for (const business of Object.values(businesses)) {
        if (now - business.lastAction < productData[business.productType].businessTime) continue;

        switch (business.type) {
            case "factory":
                if (business.stock < business.maxStock) business.stock++;
            break;

            case "buyer":
                if (business.stock > 0) business.stock--;
            break;
        }

        business.lastAction = now;
    }
}

setInterval(doBusinessWork, config.businessWorkInterval);

// Dropped products
const droppedProducts = {};

function createDroppedProduct(type, position, rotation, dimension) {
    if (productData[type]) {
        const UUID = util.UUID();
        droppedProducts[UUID] = new DroppedProduct(UUID, type, position, rotation, dimension);
    }
}

function removeDroppedProduct(UUID) {
    if (droppedProducts[UUID]) {
        droppedProducts[UUID].destroy();
        delete droppedProducts[UUID];
    }
}

function cleanDroppedProducts() {
    const now = Date.now();

    for (const [key, value] of Object.entries(droppedProducts)) {
        if (now - value.time < config.droppedProductLife) continue;

        droppedProducts[key].destroy();
        delete droppedProducts[key];
    }
}

setInterval(cleanDroppedProducts, config.worldCleanerInterval);

// Load extensions
const extPath = path.join(__dirname, "extensions");
fs.readdir(extPath, (error, files) => {
    if (error) {
        console.error(`[COURIER] Failed reading extensions folder: ${error.message}`);
        return;
    }

    for (const file of files) require(path.join(extPath, file));
});

// Script Events
mp.events.add("courierRequestInventory", (player, vehicleID) => {
    const vehicle = mp.vehicles.at(vehicleID);
    if (vehicle == null) {
        player.outputChatBox("Invalid vehicle.");
        return;
    }

    if (!vehicle.hasProductInventory()) {
        player.outputChatBox("This vehicle can't carry any products.");
        return;
    }

    if (player.dist(vehicle.position) >= 5.0) {
        player.outputChatBox("Vehicle is too far away.");
        return;
    }

    player.call("courierReceiveInventory", [ vehicle.getProductInventory() ]);
});

mp.events.add("courierInteractVehicle", (player, vehicleID, loadProduct, index) => {
    const vehicle = mp.vehicles.at(vehicleID);
    if (vehicle == null) {
        player.outputChatBox("Invalid vehicle.");
        return;
    }

    if (!vehicle.hasProductInventory()) {
        player.outputChatBox("This vehicle can't carry any products.");
        return;
    }

    if (player.dist(vehicle.position) >= 5.0) {
        player.outputChatBox("Vehicle is too far away.");
        return;
    }

    if (loadProduct) {
        const type = player.getCarryingProduct();
        if (typeof productData[type] === "undefined") {
            player.outputChatBox("You're not carrying a product.");
            return;
        }

        if (vehicle.giveProduct(index, type)) {
            player.stopCarryingProduct();
            player.outputChatBox(`Loaded "${productData[type].name}" to the vehicle.`);
        } else {
            player.outputChatBox("Couldn't load product to the vehicle.");
        }
    } else {
        if (player.isCarryingProduct()) {
            player.outputChatBox("You're already carrying a product.");
            return;
        }

        const productType = vehicle.getProduct(index);
        if (productType == null) {
            player.outputChatBox("No product on that slot.");
            return;
        }

        if (vehicle.removeProduct(index)) {
            player.startCarryingProduct(productType);
        } else {
            player.outputChatBox("Couldn't take product from the vehicle.");
        }
    }
});

// RAGEMP Events
mp.events.add("playerReady", (player) => {
    player._boxType = null;
    player._crInteractionType = null;
    player._crInteractionID = null;

    player.call("registerCourierData", [clientData, clientModelList]);
});

mp.events.add("playerDeath", (player) => {
    const type = player.getCarryingProduct();
    if (productData[type]) {
        if (config.dropProductOnDeath) createDroppedProduct(type, player.position.subtract(new mp.Vector3(0.0, 0.0, 1.0)), player.heading, player.dimension);
        player.stopCarryingProduct();
    }
});

if (config.dropProductOnDisconnect) {
    mp.events.add("playerQuit", (player) => {
        const type = player.getCarryingProduct();
        if (productData[type]) createDroppedProduct(type, player.position.subtract(new mp.Vector3(0.0, 0.0, 1.0)), player.heading, player.dimension);
    });
}

mp.events.add("entityCreated", (entity) => {
    if (entity.type === "vehicle" && vehicleLimits[entity.model] > 0) entity.setProductInventory(new Array(vehicleLimits[entity.model]));
});

mp.events.add("vehicleDeath", (vehicle) => {
    if (vehicle.hasProductInventory()) {
        const vehicleInventory = vehicle.getProductInventory();
        for (let i = 0, max = vehicleInventory.length; i < max; i++) vehicleInventory[i] = null;
    }
});

mp.events.add("playerEnterColshape", (player, shape) => {
    if (validColShapeTypes.includes(shape.courierType)) {
        player._crInteractionType = shape.courierType;
        player._crInteractionID = shape.scriptUUID;
    }
});

mp.events.add("playerExitColshape", (player, shape) => {
    if (validColShapeTypes.includes(shape.courierType)) {
        player._crInteractionType = null;
        player._crInteractionID = null;
    }
});

// Commands
mp.events.addCommand("dropproduct", (player) => {
    const type = player.getCarryingProduct();
    if (typeof productData[type] === "undefined") {
        player.outputChatBox("You're not carrying a product.");
        return;
    }

    switch (player._crInteractionType) {
        case "factory":
            // Dropping it at a factory returns your money.
            const factoryUUID = player._crInteractionID;
            if (typeof businesses[factoryUUID] === "undefined") {
                player.outputChatBox("Invalid business.");
                return;
            }

            const factory = businesses[factoryUUID];
            if (type !== factory.productType) {
                player.outputChatBox("This factory doesn't accept your product.");
                return;
            }

            if ((factory.stock + 1) > factory.maxStock) {
                player.outputChatBox("This factory is full.");
                return;
            }

            player.changeCurrency("cash", productData[factory.productType].price);
            player.stopCarryingProduct();

            factory.stock++;
        break;

        case "buyer":
            // Dropping it at a buyer results in profit.
            const buyerUUID = player._crInteractionID;
            if (typeof businesses[buyerUUID] === "undefined") {
                player.outputChatBox("Invalid business.");
                return;
            }

            const buyer = businesses[buyerUUID];
            if (type !== buyer.productType) {
                player.outputChatBox("This buyer doesn't accept your product.");
                return;
            }

            if ((buyer.stock + 1) > buyer.maxStock) {
                player.outputChatBox("This buyer is full.");
                return;
            }

            player.changeCurrency("cash", Math.floor(productData[buyer.productType].price * productData[buyer.productType].profit));
            player.stopCarryingProduct();

            buyer.stock++;
        break;

        default:
            // If the player isn't at a factory or a buyer, they will just put the box on the ground.
            player.stopCarryingProduct();
            createDroppedProduct(type, player.position.subtract(new mp.Vector3(0.0, 0.0, 1.0)), player.heading, player.dimension);
    }
});

mp.events.addCommand("takeproduct", (player) => {
    if (player.isCarryingProduct()) {
        player.outputChatBox("You're already carrying a product.");
        return;
    }

    switch (player._crInteractionType) {
        case "factory":
            // Buying a product from a factory.
            const factoryUUID = player._crInteractionID;
            if (typeof businesses[factoryUUID] === "undefined") {
                player.outputChatBox("Invalid business.");
                return;
            }

            const factory = businesses[factoryUUID];
            if (factory.stock < 1) {
                player.outputChatBox("This factory is out of product.");
                return;
            }

            if (player.getCurrency("cash") < productData[factory.productType].price) {
                player.outputChatBox("You can't afford this product.");
                return;
            }

            player.changeCurrency("cash", -productData[factory.productType].price);
            player.startCarryingProduct(factory.productType);

            factory.stock--;
        break;

        case "product":
            // Taking a product from the ground.
            const productUUID = player._crInteractionID;
            if (typeof droppedProducts[productUUID] === "undefined") {
                player.outputChatBox("Invalid product.");
                return;
            }

            player.startCarryingProduct(droppedProducts[productUUID].type);
            removeDroppedProduct(productUUID);
        break;

        default:
            player.outputChatBox("Not near any product source.");
    }
});