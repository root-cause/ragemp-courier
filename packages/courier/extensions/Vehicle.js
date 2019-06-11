const productData = require("../json/products");

mp.Vehicle.prototype.setProductInventory = function(newInventory) {
    if (Array.isArray(newInventory)) this._loadedProducts = newInventory;
};

mp.Vehicle.prototype.hasProductInventory = function() {
    return Array.isArray(this._loadedProducts);
};

mp.Vehicle.prototype.getProductInventory = function() {
    return this._loadedProducts;
};

mp.Vehicle.prototype.giveProduct = function(index, productType) {
    if (!Array.isArray(this._loadedProducts) || typeof productData[productType] === "undefined" || index < 0 || index >= this._loadedProducts.length || this._loadedProducts[index]) {
        return false;
    }

    this._loadedProducts[index] = productType;
    return true;
};

mp.Vehicle.prototype.getProduct = function(index) {
    if (!Array.isArray(this._loadedProducts) || index < 0 || index >= this._loadedProducts.length) {
        return null;
    }

    return this._loadedProducts[index];
};

mp.Vehicle.prototype.removeProduct = function(index) {
    if (!Array.isArray(this._loadedProducts) || index < 0 || index >= this._loadedProducts.length || this._loadedProducts[index] == null) {
        return false;
    }

    this._loadedProducts[index] = null;
    return true;
};