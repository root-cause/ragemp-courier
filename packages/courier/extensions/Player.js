const productData = require("../json/products");

mp.Player.prototype.isCarryingProduct = function() {
    return this._boxType != null;
};

mp.Player.prototype.getCarryingProduct = function() {
    return this._boxType;
};

mp.Player.prototype.startCarryingProduct = function(type) {
    if (productData[type] && this._boxType == null) {
        this._boxType = type;

        this.addAttachment(`cr_attach_${type}`, false);
        this.playAnimation("anim@heists@box_carry@", "idle", 4.0, 49); // 49 = Loop + Upper Body Only + Allow Rotation
        this.call("courierSetCarrying", [true]);
    }
};

mp.Player.prototype.stopCarryingProduct = function() {
    if (this._boxType) {
        this.addAttachment(`cr_attach_${this._boxType}`, true);
        this.stopAnimation();
        this.call("courierSetCarrying", [false]);

        this._boxType = null;
    }
};