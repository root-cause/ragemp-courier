const productData = require("../json/products");

const labelOffset = new mp.Vector3(0.0, 0.0, 0.75);

class DroppedProduct {
    constructor(UUID, type, position, rotation, dimension) {
        this._type = type;
        this._time = Date.now();

        // Entities
        if (productData[type]) {
            this._label = mp.labels.new(`${productData[type].name}\n/takeproduct`, position.add(labelOffset), {
                los: true,
                font: 0,
                drawDistance: 2.0,
                color: [255, 255, 255, 255],
                dimension: dimension
            });

            this._colShape = mp.colshapes.newSphere(position.x, position.y, position.z, 1.5, dimension);
            this._colShape.courierType = "product";
            this._colShape.scriptUUID = UUID;

            this._prop = mp.objects.new(productData[type].model, position, {
                rotation: new mp.Vector3(0.0, 0.0, rotation),
                dimension: dimension
            });
        }
    }

    get type() {
        return this._type;
    }

    get time() {
        return this._time;
    }

    destroy() {
        if (this._label) this._label.destroy();
        if (this._colShape) this._colShape.destroy();
        if (this._prop) this._prop.destroy();
    }
}

module.exports = DroppedProduct;