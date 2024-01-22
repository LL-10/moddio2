class Label extends THREE.Group {
	protected sprite;
	private scaleScalar = 1;
	private text = 'cccccc';
	private color = 'white';
	private bold = false;

	constructor(text = 'cccccc') {
		super();

		this.sprite = this.createLabel(text);
		this.add(this.sprite);
	}

	update(text: string, color = 'white', bold = false) {
		this.text = text;
		this.color = color;
		this.bold = bold;

		this.remove(this.sprite);
		this.sprite = this.createLabel(text, color, bold);
		this.add(this.sprite);
	}

	setOffset(offset: THREE.Vector3) {
		this.sprite.geometry.translate(
			offset.x / 64 / 2 / this.scaleScalar,
			offset.y / 64 + ((this.sprite.material.map.image.height / 64 / 100) * 1.5) / this.scaleScalar,
			offset.z / 64 / 2 / this.scaleScalar
		);
	}

	setScale(scale: number) {
		this.scaleScalar = scale;
		this.sprite.scale.setScalar(scale);
	}

	private createLabel(text: string, color = 'white', bold = false) {
		const textCanvas = document.createElement('canvas');
		textCanvas.height = 34;

		const ctx = textCanvas.getContext('2d');
		const font = `${bold ? 'bold' : 'normal'} 16px Verdana`;

		ctx.font = font;
		textCanvas.width = Math.ceil(ctx.measureText(text).width + 16);

		if (taro.game.data.settings.addStrokeToNameAndAttributes) {
			ctx.font = font;
			ctx.strokeStyle = '#000';
			ctx.lineWidth = 4;
			ctx.lineJoin = 'miter';
			ctx.miterLimit = 3;
			ctx.strokeText(text, 8, 26);
		}

		ctx.fillStyle = color;
		ctx.font = font;
		ctx.font;
		ctx.fillText(text, 8, 26);

		const spriteMap = new THREE.Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height));
		spriteMap.minFilter = THREE.LinearFilter;
		spriteMap.generateMipmaps = false;
		spriteMap.needsUpdate = true;

		const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteMap }));
		sprite.scale.set(this.scaleScalar * (textCanvas.width / textCanvas.height), this.scaleScalar, 1);

		return sprite;
	}
}
