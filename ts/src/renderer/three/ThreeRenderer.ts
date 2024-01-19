/// <reference types="@types/google.analytics" />

class ThreeRenderer {
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.Camera;
	private controls: OrbitControls;
	private scene: THREE.Scene;

	private textures: Map<string, THREE.Texture> = new Map();

	private units: Unit[] = [];
	private entities: THREE.Mesh[] = [];

	private pointer = new THREE.Vector2();
	private followedUnit: Unit | null = null;

	constructor() {
		const renderer = new THREE.WebGLRenderer();
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.querySelector('#game-div')?.appendChild(renderer.domElement);
		this.renderer = renderer;

		const width = window.innerWidth;
		const height = window.innerHeight;
		this.camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);

		// this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.y = 20;
		this.camera.position.z = 20;

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.target = new THREE.Vector3(0, 0, 10);

		this.scene = new THREE.Scene();

		THREE.DefaultLoadingManager.onLoad = () => {
			console.log(this.textures);
			this.init();
			this.setupInputListeners();
			taro.client.rendererLoaded.resolve();
			requestAnimationFrame(this.render.bind(this));
		};

		this.loadTextures();
	}

	private loadTextures() {
		const textureLoader = new THREE.TextureLoader();
		const data = taro.game.data;

		data.map.tilesets.forEach((tileset) => {
			const key = tileset.image;
			const url = Utils.patchAssetUrl(key);
			textureLoader.load(url, (tex) => {
				tex.colorSpace = THREE.SRGBColorSpace;
				this.textures.set(key, tex);
			});
		});

		for (let type in data.unitTypes) {
			const cellSheet = data.unitTypes[type].cellSheet;
			if (!cellSheet) continue;
			const key = cellSheet.url;
			const url = Utils.patchAssetUrl(key);
			textureLoader.load(url, (tex) => {
				tex.colorSpace = THREE.SRGBColorSpace;
				this.textures.set(key, tex);
			});
		}

		for (let type in data.projectileTypes) {
			const cellSheet = data.projectileTypes[type].cellSheet;
			if (!cellSheet) continue;
			const key = cellSheet.url;
			const url = Utils.patchAssetUrl(key);
			textureLoader.load(url, (tex) => {
				tex.colorSpace = THREE.SRGBColorSpace;
				this.textures.set(key, tex);
			});
		}

		for (let type in data.itemTypes) {
			const cellSheet = data.itemTypes[type].cellSheet;
			if (!cellSheet) continue;
			const key = cellSheet.url;
			const url = Utils.patchAssetUrl(key);
			textureLoader.load(url, (tex) => {
				tex.colorSpace = THREE.SRGBColorSpace;
				this.textures.set(key, tex);
			});
		}

		for (let type in data.particleTypes) {
			const key = data.particleTypes[type].url;
			const url = Utils.patchAssetUrl(key);
			textureLoader.load(url, (tex) => {
				tex.colorSpace = THREE.SRGBColorSpace;
				this.textures.set(key, tex);
			});
		}
	}

	private init() {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ transparent: true });
		const cube = new THREE.Mesh(geometry, material);

		taro.game.data.map.tilesets.forEach((tileset) => {
			const tex = this.textures.get(tileset.image);
			tex.minFilter = THREE.NearestFilter;
			tex.magFilter = THREE.NearestFilter;
			tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

			cube.material.map = tex;
			cube.material.needsUpdate = true;

			const map = new THREE.Group();
			map.translateX(-taro.game.data.map.width / 2);
			map.translateZ(-taro.game.data.map.height / 2);
			this.scene.add(map);

			const tileSize = 64;
			const texWidth = tex.image.width;
			const texHeight = tex.image.height;
			const tilesInRow = texWidth / tileSize;

			const xStep = tileSize / texWidth;
			const yStep = tileSize / texHeight;

			taro.game.data.map.layers.forEach((layer) => {
				if (layer.name === 'floor') {
					for (let z = 0; z < layer.height; z++) {
						for (let x = 0; x < layer.width; x++) {
							const newCube = cube.clone();
							newCube.position.set(x, 0, z);
							newCube.material = newCube.material.clone();

							const tileIdx = layer.data[z * layer.width + x];
							const xIdx = (tileIdx % tilesInRow) - 1;
							const yIdx = Math.floor(tileIdx / tilesInRow);

							newCube.material.map = newCube.material.map.clone();
							newCube.material.map.repeat.set(tileSize / texWidth, tileSize / texHeight);
							newCube.material.map.offset.x = xStep * xIdx;
							newCube.material.map.offset.y = 1 - yStep * yIdx - yStep;

							map.add(newCube);
						}
					}
				}

				if (layer.name === 'walls') {
					for (let z = 0; z < layer.height; z++) {
						for (let x = 0; x < layer.width; x++) {
							if (layer.data[z * layer.width + x] !== 0) {
								const newCube = cube.clone();
								newCube.position.set(x, 1, z);
								newCube.material = newCube.material.clone();

								const tileIdx = layer.data[z * layer.width + x];
								const xIdx = (tileIdx % tilesInRow) - 1;
								const yIdx = Math.floor(tileIdx / tilesInRow);

								newCube.material.map = newCube.material.map.clone();
								newCube.material.map.repeat.set(tileSize / texWidth, tileSize / texHeight);
								newCube.material.map.offset.x = xStep * xIdx;
								newCube.material.map.offset.y = 1 - yStep * yIdx - yStep;

								map.add(newCube);
							}
						}
					}
				}
			});
		});

		const entities = new THREE.Group();
		entities.translateX(-taro.game.data.map.width / 2);
		entities.translateZ(-taro.game.data.map.height / 2);
		this.scene.add(entities);

		taro.client.on('create-unit', (unit: Unit) => {
			this.units.push(unit);

			const tex = this.textures.get(unit._stats.cellSheet.url);
			const newCube = cube.clone();
			newCube.scale.set(tex.image.width / 64, 1, tex.image.height / 64);
			newCube.position.set(unit._translate.x / 64, 1, unit._translate.y / 64);
			newCube.material = newCube.material.clone();
			newCube.material.map = this.textures.get(unit._stats.cellSheet.url);
			entities.add(newCube);

			this.entities.push(newCube);

			unit.on(
				'transform',
				(data: { x: number; y: number; rotation: number }) => {
					unit._translate.x = data.x;
					unit._translate.y = data.y;
					unit._rotate.z = data.rotation;
				},
				this
			);

			unit.on(
				'size',
				(data: { width: number; height: number }) => {
					unit._scale.x = data.width / 64;
					unit._scale.y = data.height / 64;
					newCube.scale.set(unit._scale.x, 1, unit._scale.y);
				},
				this
			);

			unit.on(
				'follow',
				() => {
					// console.log('follow ', unit);
					// newCube.add(this.camera);
					this.followedUnit = unit;
				},
				this
			),
				this;
		});

		taro.client.on('create-item', (item: Item) => {
			this.units.push(item);

			const tex = this.textures.get(item._stats.cellSheet.url);
			const newCube = cube.clone();
			newCube.scale.set(tex.image.width / 64, 1, tex.image.height / 64);
			newCube.position.set(item._translate.x / 64, 1, item._translate.y / 64);
			newCube.material = newCube.material.clone();
			newCube.material.map = this.textures.get(item._stats.cellSheet.url);
			entities.add(newCube);

			this.entities.push(newCube);

			item.on(
				'transform',
				(data: { x: number; y: number; rotation: number }) => {
					item._translate.x = data.x;
					item._translate.y = data.y;
					item._rotate.z = data.rotation;
				},
				this
			);

			item.on(
				'size',
				(data: { width: number; height: number }) => {
					item._scale.x = data.width / 64;
					item._scale.y = data.height / 64;
					newCube.scale.set(item._scale.x, 1, item._scale.y);
				},
				this
			);

			this;
		});

		taro.client.on('create-projectile', (projectile: Item) => {
			this.units.push(projectile);

			const tex = this.textures.get(projectile._stats.cellSheet.url);
			const newCube = cube.clone();
			newCube.scale.set(tex.image.width / 64, 1, tex.image.height / 64);
			newCube.position.set(projectile._translate.x / 64, 1, projectile._translate.y / 64);
			newCube.material = newCube.material.clone();
			newCube.material.map = this.textures.get(projectile._stats.cellSheet.url);
			entities.add(newCube);

			this.entities.push(newCube);

			projectile.on(
				'transform',
				(data: { x: number; y: number; rotation: number }) => {
					projectile._translate.x = data.x;
					projectile._translate.y = data.y;
					projectile._rotate.z = data.rotation;
				},
				this
			);

			projectile.on(
				'size',
				(data: { width: number; height: number }) => {
					projectile._scale.x = data.width / 64;
					projectile._scale.y = data.height / 64;
					newCube.scale.set(projectile._scale.x, 1, projectile._scale.y);
				},
				this
			);

			this;
		});

		this.renderer.domElement.addEventListener('mousemove', (evt: MouseEvent) => {
			this.pointer.set((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);
		});
	}

	private setupInputListeners(): void {
		// Ask the input component to set up any listeners it has
		taro.input.setupListeners(this.renderer.domElement);
	}

	getViewportBounds() {
		// return this.scene.getScene('Game').cameras.main.worldView;
		return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
	}

	getCameraWidth(): number {
		// return this.scene.getScene('Game').cameras.main.displayWidth;
		return window.innerWidth;
	}

	getCameraHeight(): number {
		// return this.scene.getScene('Game').cameras.main.displayHeight;
		return window.innerHeight;
	}

	render() {
		requestAnimationFrame(this.render.bind(this));

		if (this.followedUnit) {
			const pointer = new THREE.Vector3(this.pointer.x, this.pointer.y, 0.5);
			pointer.unproject(this.camera);
			taro.input.emit('pointermove', [
				{
					x: (pointer.x + taro.game.data.map.width / 2 + 0.5) * 64,
					y: (pointer.z + taro.game.data.map.height / 2 + 0.5) * 64,
				},
			]);
		}

		if (this.followedUnit) {
			this.camera.position.set(
				this.followedUnit._translate.x / 64 - 0.5 - taro.game.data.map.width / 2,
				this.camera.position.y,
				this.followedUnit._translate.y / 64 - 0.5 - taro.game.data.map.height / 2
			);

			this.controls.target.set(
				this.followedUnit._translate.x / 64 - 0.5 - taro.game.data.map.width / 2,
				this.controls.target.y,
				this.followedUnit._translate.y / 64 - 0.5 - taro.game.data.map.height / 2
			);
			this.controls.update();
		}

		if (this.units.length > 0) {
			for (let i = 0; i < this.units.length; i++) {
				const u = this.units[i];
				this.entities[i].position.set(u._translate.x / 64 - 0.5, 1, u._translate.y / 64 - 0.5);
				this.entities[i].rotation.y = -u._rotate.z;
			}
		}

		this.controls.update();
		this.renderer.render(this.scene, this.camera);

		taro.client.emit('tick');
	}
}
