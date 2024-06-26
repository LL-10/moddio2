/**
 * Tile maps provide a way to align mounted child objects to a tile-based grid.
 * NOTE: These are not to be confused with TaroTextureMap's which allow you to
 * paint a bunch of tiles to a grid.
 */
var TaroTileMap2d = TaroEntity.extend({
	classId: 'TaroTileMap2d',
	TaroTileMap2d: true,

	init: function (tileWidth, tileHeight) {
		TaroEntity.prototype.init.call(this);

		tileWidth = tileWidth !== undefined ? tileWidth : 40;
		tileHeight = tileHeight !== undefined ? tileHeight : 40;

		var self = this;

		self.map = new TaroMap2d();
		self._adjustmentMatrix = new TaroMatrix2d();

		self.tileWidth(tileWidth);
		self.tileHeight(tileHeight);
		self.gridSize(3, 3);
	},

	/**
	 * Gets / sets the map's tile width.
	 * @param {Number} val Tile width.
	 * @return {*}
	 */
	tileWidth: function (val) {
		if (val !== undefined) {
			this._tileWidth = val;
			if (this._gridSize && this._gridSize.x) {
				this.width(this._tileWidth * this._gridSize.x);
				this._updateAdjustmentMatrix();
			}

			return this;
		}

		return this._tileWidth;
	},

	/**
	 * Gets / sets the map's tile height.
	 * @param {Number} val Tile height.
	 * @return {*}
	 */
	tileHeight: function (val) {
		if (val !== undefined) {
			this._tileHeight = val;
			if (this._gridSize && this._gridSize.y) {
				this.height(this._tileHeight * this._gridSize.y);
				this._updateAdjustmentMatrix();
			}

			return this;
		}

		return this._tileHeight;
	},

	gridSize: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._gridSize = new TaroPoint2d(x, y);

			// If in 2d mount mode
			if (this._mountMode === 0) {
				if (this._tileWidth) {
					this.width(this._tileWidth * this._gridSize.x);
				}
			}

			// If in isometric mount mode
			if (this._mountMode === 1) {
				if (this._tileWidth) {
					this.width(this._tileWidth * 2 * this._gridSize.x);
				}
			}

			if (this._tileHeight) {
				this.height(this._tileHeight * this._gridSize.y);
			}

			this._updateAdjustmentMatrix();

			return this;
		}

		return this._gridSize;
	},

	/**
	 * Sets a tile or area as occupied by the passed obj parameter.
	 * Any previous occupy data on the specified tile or area will be
	 * overwritten.
	 * @param {Number} x X co-ordinate of the tile to un-occupy.
	 * @param {Number} y Y co-ordinate of the tile to un-occupy.
	 * @param {Number} width Number of tiles along the x-axis to occupy.
	 * @param {Number} height Number of tiles along the y-axis to occupy.
	 * @param {*} obj
	 * @return {*}
	 */
	occupyTile: function (x, y, width, height, obj) {
		var xi, yi;

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					this.map.tileData(x + xi, y + yi, obj);
				}
			}

			// Create an TaroRect to represent the tiles this
			// entity has just occupied
			if (obj._classId) {
				obj._occupiedRect = new TaroRect(x, y, width, height);
			}
		}
		return this;
	},

	/**
	 * Removes all data from the specified tile or area.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	unOccupyTile: function (x, y, width, height) {
		var xi, yi, item;

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					item = this.map.tileData(x + xi, y + yi);
					if (item && item._occupiedRect) {
						delete item._occupiedRect;
					}
					this.map.clearData(x + xi, y + yi);
				}
			}
		}
		return this;
	},

	/**
	 * Returns true if the specified tile or tile area has
	 * an occupied status.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	isTileOccupied: function (x, y, width, height) {
		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		return this.map.collision(x, y, width, height);
	},

	tileOccupiedBy: function (x, y) {
		return this.map.tileData(x, y);
	},

	/**
	 * Returns the tile co-ordinates of the tile that the point's world
	 * co-ordinates reside inside.
	 * @param {TaroPoint3d} point
	 * @return {TaroPoint3d} The tile co-ordinates as a point object.
	 */
	pointToTile: function (point) {
		// TODO: Could this do with some caching to check if the input values have changed and if not,
		// TODO: supply the same pre-calculated data if it already exists?
		var mx = point.x;
		var my = point.y;
		var dx;
		var dy;
		var tilePos;

		if (this._mountMode === 0) {
			// 2d
			dx = mx; // + this._tileWidth / 2;
			dy = my; // + this._tileHeight / 2;

			tilePos = new TaroPoint3d(Math.floor(dx / this._tileWidth), Math.floor(dy / this._tileWidth), 0);
		}

		if (this._mountMode === 1) {
			// iso
			dx = mx;
			dy = my;

			tilePos = new TaroPoint3d(Math.floor(dx / this._tileWidth), Math.floor(dy / this._tileHeight), 0);
		}

		return tilePos;
	},

	/**
	 * Returns the world co-ordinates of the tile the mouse is currently over.
	 * @return {TaroPoint3d}
	 */
	mouseTilePoint: function () {
		var tilePos = this.mouseToTile().thisMultiply(this._tileWidth, this._tileHeight, 1);

		tilePos.x += this._tileWidth / 2;
		tilePos.y += this._tileHeight / 2;

		return tilePos;
	},

	tileToPoint: function (x, y) {
		var point;

		if (this._mountMode === 0) {
			point = new TaroPoint3d(x, y, 0).thisMultiply(this._tileWidth, this._tileHeight, 1);

			point.x -= this._bounds2d.x2 - this._tileWidth / 2;
			point.y -= this._bounds2d.y2 - this._tileHeight / 2;
		}

		if (this._mountMode === 1) {
			point = new TaroPoint3d(
				x * this._tileWidth + this._tileWidth / 2,
				y * this._tileHeight + this._tileHeight / 2,
				0
			);
			point.x -= this._bounds2d.x2 / 2;
			point.y -= this._bounds2d.y2;
		}

		point.x2 = point.x / 2;
		point.y2 = point.y / 2;

		return point;
	},

	/**
	 * Returns the tile co-ordinates of the tile the mouse is currently over.
	 * @return {TaroPoint3d}
	 */
	mouseToTile: function (vp) {
		var tilePos;
		if (!vp) vp = taro.client.vp1;
		if (this._mountMode === 0) {
			tilePos = this.pointToTile(vp.mousePos());
		} else {
			tilePos = this.pointToTile(vp.mousePos().to2d());
		}
		return tilePos;
	},

	/**
	 * Scans the map data and returns an array of rectangle
	 * objects that encapsulate the map data into discrete
	 * rectangle areas.
	 * @param {Function=} callback Returns true or false for
	 * the passed map data determining if it should be included
	 * in a rectangle or not.
	 * @return {Array}
	 */
	scanRects: function (callback) {
		var x;
		var y;
		var rectArray = [];
		var mapData = this.map._mapData.clone();

		// Loop the map data and scan for blocks that can
		// be converted into static box2d rectangle areas
		for (y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (mapData[y][x] && (!callback || (callback && callback(mapData[y][x], x, y)))) {
							rectArray.push(this._scanRects(mapData, parseInt(x, 10), parseInt(y, 10), callback));
						}
					}
				}
			}
		}

		return rectArray;
	},

	_scanRects: function (mapData, x, y, callback) {
		var rect = {
			x: x,
			y: y,
			width: 1,
			height: 1,
		};
		var nx = x + 1;
		var ny = y + 1;

		// Clear the current x, y cell mapData
		mapData[y][x] = 0;

		while (mapData[y][nx] && (!callback || (callback && callback(mapData[y][nx], nx, y)))) {
			rect.width++;

			// Clear the mapData for this cell
			mapData[y][nx] = 0;

			// Next column
			nx++;
		}

		while (mapData[ny] && mapData[ny][x] && (!callback || (callback && callback(mapData[ny][x], x, ny)))) {
			// Check for mapData either side of the column width
			if (
				(mapData[ny][x - 1] && (!callback || (callback && callback(mapData[ny][x - 1], x - 1, ny)))) ||
				(mapData[ny][x + rect.width] &&
					(!callback || (callback && callback(mapData[ny][x + rect.width], x + rect.width, ny))))
			) {
				return rect;
			}

			// Loop the column's map data and check that there is
			// an intact column the same width as the starting column
			for (nx = x; nx < x + rect.width; nx++) {
				if (!mapData[ny][nx] || (callback && !callback(mapData[ny][nx], nx, ny))) {
					// This row has a different column width from the starting
					// column so return the rectangle as it stands
					return rect;
				}
			}

			// Mark the row as cleared
			for (nx = x; nx < x + rect.width; nx++) {
				mapData[ny][nx] = 0;
			}

			rect.height++;
			ny++;
		}

		return rect;
	},

	inGrid: function (x, y, width, height) {
		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		// Checks if the passed area is inside the tile map grid as defined by gridSize
		return x >= 0 && y >= 0 && x + width <= this._gridSize.x && y + height <= this._gridSize.y;
	},

	/**
	 * Loads map data from a saved map.
	 * @param {Object} map The map data object.
	 */
	loadMap: function (map) {
		// Just fill in the map data
		this.map.mapData(map.data, 0, 0);

		return this;
	},

	/**
	 * Returns a map JSON string that can be saved to a data file and loaded
	 * with the loadMap() method.
	 * @return {Object} The map data object.
	 */
	saveMap: function (layer) {
		// in URL format
		var textures = [];
		var i;
		var x;
		var y;
		var dataX = 0;
		var dataY = 0;
		var mapData = layer.map._mapData;

		// Get the lowest x, y
		for (y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (parseInt(x) < parseInt(dataX)) {
							dataX = parseInt(x);
						}

						if (parseInt(y) < parseInt(dataY)) {
							dataY = parseInt(y);
						}
					}
				}
			}
		}

		return JSON.stringify({
			data: layer.map.sortedMapDataAsArray(),
			dataXY: [parseInt(dataX, 10), parseInt(dataY, 10)],
		});
	},

	isometricMounts: function (val) {
		if (val !== undefined) {
			TaroEntity.prototype.isometricMounts.call(this, val);

			// Re-call the methods that check iso mounts property
			this.tileWidth(this._tileWidth);
			this.tileHeight(this._tileHeight);
			this.gridSize(this._gridSize.x, this._gridSize.y);

			this._updateAdjustmentMatrix();
			return this;
		}

		return this._mountMode;
	},

	tileMapHitPolygon: function (mousePoint) {
		if (this._mountMode === 0) {
			return this.aabb();
		}

		if (this._mountMode === 1) {
			var aabb = this.aabb();
			var poly = new TaroPoly2d();

			poly.addPoint(aabb.x + aabb.width / 2, aabb.y);
			poly.addPoint(aabb.x + aabb.width, aabb.y + aabb.height / 2);
			poly.addPoint(aabb.x + aabb.width / 2, aabb.y + aabb.height - 1);
			poly.addPoint(aabb.x - 1, aabb.y + aabb.height / 2 - 1);

			return poly;
		}
	},

	_processTriggerHitTests: function () {
		// This method overrides the one in TaroEntity
		if (this._mouseEventsActive && taro._currentViewport) {
			if (!this._mouseAlwaysInside) {
				var mouseTile = this.mouseToTile(taro._selectedViewport);
				if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < this._gridSize.x && mouseTile.y < this._gridSize.y) {
					return true;
				} else {
					return false;
				}
			} else {
				return true;
			}
		}

		return false;
	},

	_updateAdjustmentMatrix: function () {
		if (this._bounds2d.x2 && this._bounds2d.y2 && this._tileWidth && this._tileHeight) {
			if (this._mountMode === 0) {
				this._adjustmentMatrix.translateTo(this._bounds2d.x2, this._bounds2d.y2);
			}

			if (this._mountMode === 1) {
				this._adjustmentMatrix.translateTo(0, this._bounds2d.y2);
			}
		}
	},

	_childMounted: function (obj) {
		// We can also re-use the tile size methods since
		// they alter the same properties on the calling
		// entity anyway.
		obj.tileWidth = obj.tileWidth || this.tileWidth;
		obj.tileHeight = obj.tileHeight || this.tileHeight;

		// Set default values
		obj._tileWidth = obj._tileWidth || 1;
		obj._tileHeight = obj._tileHeight || 1;

		TaroEntity.prototype._childMounted.call(this, obj);
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroTileMap2d;
}
