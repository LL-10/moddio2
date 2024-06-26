/**
 * Creates a new rectangle (x, y, width, height).
 */
var TaroRect = TaroClass.extend({
	classId: 'TaroRect',

	init: function (x, y, width, height) {
		// Set values to the passed parameters or
		// zero if they are undefined
		this.x = x = x !== undefined ? x : 0;
		this.y = y = y !== undefined ? y : 0;
		this.width = width = width !== undefined ? width : 0;
		this.height = height = height !== undefined ? height : 0;

		this.x2 = this.x / 2;
		this.y2 = this.y / 2;

		return this;
	},

	/**
	 * Combines the extents of the passed TaroRect with this rect
	 * to create a new rect whose bounds encapsulate both rects.
	 * @param {TaroRect} rect The rect to combine with this one.
	 * @return {TaroRect} The new rect encapsulating both rects.
	 */
	combineRect: function (rect) {
		var thisRectMaxX = this.x + this.width;
		var thisRectMaxY = this.y + this.height;
		var thatRectMaxX = rect.x + rect.width;
		var thatRectMaxY = rect.y + rect.height;

		var x = Math.min(this.x, rect.x);
		var y = Math.min(this.y, rect.y);
		var width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x);
		var height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);

		return new TaroRect(x, y, width, height);
	},

	/**
	 * Combines the extents of the passed TaroRect with this rect
	 * and replaces this rect with one whose bounds encapsulate
	 * both rects.
	 * @param {TaroRect} rect The rect to combine with this one.
	 */
	thisCombineRect: function (rect) {
		var thisRectMaxX = this.x + this.width;
		var thisRectMaxY = this.y + this.height;
		var thatRectMaxX = rect.x + rect.width;
		var thatRectMaxY = rect.y + rect.height;

		this.x = Math.min(this.x, rect.x);
		this.y = Math.min(this.y, rect.y);

		this.width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x);
		this.height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
	},

	minusPoint: function (point) {
		return new TaroRect(this.x - point.x, this.y - point.y, this.width, this.height);
	},

	/**
	 * Compares this rect's dimensions with the passed rect and returns
	 * true if they are the same and false if any is different.
	 * @param {TaroRect} rect
	 * @return {Boolean}
	 */
	compare: function (rect) {
		return rect && this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
	},

	/**
	 * Returns boolean indicating if the passed x, y is
	 * inside the rectangle.
	 * @param x
	 * @param y
	 * @return {Boolean}
	 */
	xyInside: function (x, y) {
		return x >= this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
	},

	/**
	 * Returns boolean indicating if the passed point is
	 * inside the rectangle.
	 * @param {TaroPoint3d} point
	 * @return {Boolean}
	 */
	pointInside: function (point) {
		return point.x >= this.x && point.y > this.y && point.x <= this.x + this.width && point.y <= this.y + this.height;
	},

	/**
	 * Returns boolean indicating if the passed TaroRect is
	 * intersecting the rectangle.
	 * @param {TaroRect} rect
	 * @return {Boolean}
	 */
	rectIntersect: function (rect) {
		this.log(
			'rectIntersect has been renamed to "intersects". Please update your code. rectIntersect will be removed in a later version of taro.',
			'warning'
		);
		return this.intersects(rect);
	},

	/**
	 * Returns boolean indicating if the passed TaroRect is
	 * intersecting the rectangle.
	 * @param {TaroRect} rect
	 * @return {Boolean}
	 */
	intersects: function (rect) {
		if (rect) {
			var sX1 = this.x;
			var sY1 = this.y;
			var sW = this.width;
			var sH = this.height;

			var dX1 = rect.x;
			var dY1 = rect.y;
			var dW = rect.width;
			var dH = rect.height;

			var sX2 = sX1 + sW;
			var sY2 = sY1 + sH;
			var dX2 = dX1 + dW;
			var dY2 = dY1 + dH;

			if (sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Multiplies this rect's data by the values specified
	 * and returns a new TaroRect whose values are the result.
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @return {*}
	 */
	multiply: function (x1, y1, x2, y2) {
		return new TaroRect(this.x * x1, this.y * y1, this.width * x2, this.height * y2);
	},

	/**
	 * Multiplies this rects's data by the values specified and
	 * overwrites the previous values with the result.
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @return {*}
	 */
	thisMultiply: function (x1, y1, x2, y2) {
		this.x *= x1;
		this.y *= y1;
		this.width *= x2;
		this.height *= y2;

		return this;
	},

	/**
	 * Returns a clone of this object that is not a reference
	 * but retains the same values.
	 * @return {TaroRect}
	 */
	clone: function () {
		return new TaroRect(this.x, this.y, this.width, this.height);
	},

	/**
	 * Returns a string representation of the rect's x, y, width,
	 * height, converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {Number=} precision
	 * @return {String}
	 */
	toString: function (precision) {
		if (precision === undefined) {
			precision = 2;
		}
		return `${this.x.toFixed(precision)},${this.y.toFixed(precision)},${this.width.toFixed(precision)},${this.height.toFixed(precision)}`;
	},

	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	render: function (ctx, fill) {
		ctx.rect(this.x, this.y, this.width, this.height);
		if (fill) {
			ctx.fill();
		}
		ctx.stroke();

		return this;
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroRect;
}
