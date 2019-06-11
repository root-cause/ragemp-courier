const util = require("../util");
const businessTypes = require("../json/businessTypes");
const productData = require("../json/products");

const labelOffset = new mp.Vector3(0.0, 0.0, 1.2);
const markerColor = [174, 219, 242, 150];

class Business {
    constructor(UUID, type, productType, stock, maxStock, position) {
        this._type = type;
        this._productType = productType;
        this._stock = stock;
        this._maxStock = maxStock;
        this.lastAction = 0;

        // Create entities
        if (businessTypes[type] && productData[productType]) {
            this._label = mp.labels.new(this._formatLabel(), position.add(labelOffset), {
                los: true,
                font: 0,
                drawDistance: 8.0,
                color: [255, 255, 255, 255]
            });

            this._marker = mp.markers.new(1, position, 3.0, {
                color: markerColor,
                visible: true
            });

            this._blip = mp.blips.new(businessTypes[type].blipSprite, position, {
                name: `${businessTypes[type].label}: ${productData[productType].name}`,
                scale: 1.2,
                shortRange: true
            });

            this._colShape = mp.colshapes.newSphere(position.x, position.y, position.z, 2.0);
            this._colShape.courierType = this._type;
            this._colShape.scriptUUID = UUID;
        }
    }

    _formatLabel() {
        if (businessTypes[this._type] && productData[this._productType]) {
            const price = this._type === "buyer" ? Math.floor(productData[this._productType].price * productData[this._productType].profit) : productData[this._productType].price;
            const commands = this._type === "factory" ? "/takeproduct - /dropproduct" : "/dropproduct";

            return `${businessTypes[this._type].label}\nProduct: ${productData[this._productType].name}\nStock: ${this._stock}/${this._maxStock}\nPrice: ~g~$${price}\n~w~${commands}`;
        } else {
            return "Invalid Business/Product Type";
        }
    }

    get type() {
        return this._type;
    }

    get productType() {
        return this._productType;
    }

    get stock() {
        return this._stock;
    }

    get maxStock() {
        return this._maxStock;
    }

    set stock(newStock) {
        this._stock = util.clamp(newStock, 0, this._maxStock);
        if (this._label) this._label.text = this._formatLabel();
    }
}

module.exports = Business;