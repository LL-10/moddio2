class ThreeCamera {
	instance: THREE.Camera;
	target: THREE.Object3D | null = null;
	zoomLevel = 1;

	private height = 6;

	private orthographicCamera: THREE.OrthographicCamera;
	private perspectiveCamera: THREE.PerspectiveCamera;
	controls: OrbitControls;

	orthographicState: { target: THREE.Vector3; position: THREE.Vector3 };
	perspectiveState: { target: THREE.Vector3; position: THREE.Vector3; zoom: number };

	private isPerspective = false;
	private fovInitial: number;
	private viewportHeightInitial: number;

	private debugInfo: HTMLDivElement;

	private onChangeCbs = [];

	constructor(viewportWidth: number, viewportHeight: number, canvas: HTMLCanvasElement) {
		const persCamera = new THREE.PerspectiveCamera(75, viewportWidth / viewportHeight, 0.1, 15000);
		persCamera.position.y = this.height;
		this.perspectiveCamera = persCamera;
		this.fovInitial = Math.tan(((Math.PI / 180) * this.perspectiveCamera.fov) / 2);
		this.viewportHeightInitial = viewportHeight;

		const halfWidth = Utils.pixelToWorld(viewportWidth / 2);
		const halfHeight = Utils.pixelToWorld(viewportHeight / 2);
		const orthoCamera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, -2000, 15000);
		orthoCamera.position.y = this.height;
		this.orthographicCamera = orthoCamera;

		this.instance = orthoCamera;

		this.controls = new OrbitControls(this.instance, canvas);
		this.controls.enableRotate = false;
		this.controls.enableZoom = false;
		this.controls.mouseButtons = { LEFT: '', MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
		this.controls.minDistance = 0.01;
		this.controls.maxDistance = 1000;
		this.controls.update();

		this.controls.addEventListener('change', () => {
			for (const cb of this.onChangeCbs) {
				cb();
			}
		});

		this.orthographicState = {
			target: new THREE.Vector3(),
			position: new THREE.Vector3(),
		};
		this.perspectiveState = {
			target: new THREE.Vector3(),
			position: new THREE.Vector3(),
			zoom: this.controls.zoom,
		};

		window.addEventListener('keypress', (evt) => {
			if (evt.key === ',') {
				this.instance = this.orthographicCamera;
				this.controls.object = this.orthographicCamera;

				const halfWidth = Utils.pixelToWorld(viewportWidth / 2);
				const halfHeight = Utils.pixelToWorld(viewportHeight / 2);
				this.orthographicCamera.top = halfHeight;
				this.orthographicCamera.bottom = -halfHeight;
				this.orthographicCamera.left = -halfWidth;
				this.orthographicCamera.right = halfWidth;
				this.orthographicCamera.zoom = this.zoomLevel;
				this.orthographicCamera.lookAt(this.controls.target);
				this.orthographicCamera.updateProjectionMatrix();
				this.orthographicCamera.position.copy(this.controls.target);
				this.orthographicCamera.position.y = this.height;
				this.controls.update();
			} else if (evt.key === '.') {
				this.isPerspective = !this.isPerspective;

				if (this.isPerspective) {
					this.switchToPerspectiveCamera();
				} else {
					this.switchToOrthographicCamera();
				}
			} else if (evt.key === '/') {
				this.controls.enableRotate = !this.controls.enableRotate;
				this.controls.enableZoom = !this.controls.enableZoom;
			}
		});

		const info = document.createElement('div');
		canvas.parentElement.appendChild(info);
		info.style.position = 'absolute';
		info.style.zIndex = '999';
		info.style.left = '0';
		info.style.top = '0';
		info.style.padding = '10px';
		info.style.margin = '5px';
		info.style.color = 'white';
		info.style.background = 'black';
		info.style.opacity = '0.75';
		info.style.marginTop = '40px';
		this.debugInfo = info;
	}

	setElevationAngle(deg: number) {
		var spherical = new THREE.Spherical();
		spherical.radius = this.controls.getDistance();
		spherical.theta = this.controls.getAzimuthalAngle();

		const rad = deg * (Math.PI / 180);
		spherical.phi = Math.PI * 0.5 - rad;

		this.controls.object.position.setFromSpherical(spherical);
		this.controls.update();
	}

	update() {
		if (this.controls.enableRotate) {
			this.controls.update();
		}

		if (this.controls.enableRotate) {
			const azimuthAngle = this.controls.getAzimuthalAngle() * (180 / Math.PI);
			const elevationAngle = (Math.PI / 2 - this.controls.getPolarAngle()) * (180 / Math.PI);
			this.debugInfo.style.display = 'block';
			this.debugInfo.innerHTML = `lookYaw: ${Utils.round(azimuthAngle, 2)} </br> lookPitch: ${Utils.round(elevationAngle, 2)}`;
		} else if (this.debugInfo.style.display !== 'none') {
			this.debugInfo.style.display = 'none';
		}

		if (this.target) {
			const targetWorldPos = new THREE.Vector3();
			this.target.getWorldPosition(targetWorldPos);
			this.setPosition(targetWorldPos);
		}
	}

	resize(width: number, height: number) {
		if (this.instance instanceof THREE.PerspectiveCamera) {
			this.instance.aspect = width / height;
			this.instance.fov = (360 / Math.PI) * Math.atan(this.fovInitial * (height / this.viewportHeightInitial));
			this.instance.updateProjectionMatrix();
		} else if (this.instance instanceof THREE.OrthographicCamera) {
			const halfWidth = Utils.pixelToWorld(width / 2);
			const halfHeight = Utils.pixelToWorld(height / 2);
			this.instance.left = -halfWidth;
			this.instance.right = halfWidth;
			this.instance.top = halfHeight;
			this.instance.bottom = -halfHeight;
			this.instance.zoom = this.height;
			this.instance.updateProjectionMatrix();
		}
	}

	zoom(ratio: number) {
		this.zoomLevel = ratio;

		if (this.instance instanceof THREE.PerspectiveCamera) {
			//
		} else if (this.instance instanceof THREE.OrthographicCamera) {
			this.instance.zoom = ratio;
			this.instance.updateProjectionMatrix();
		}
	}

	startFollow(target: THREE.Object3D) {
		this.target = target;
	}

	stopFollow() {
		this.target = null;
	}

	getWorldPoint(p: THREE.Vector2) {
		let target = this.controls.target;
		if (this.target) {
			const targetWorldPos = new THREE.Vector3();
			this.target.getWorldPosition(targetWorldPos);
			target = targetWorldPos;
		}

		// Mouse to world pos code from:
		// https://github.com/WestLangley/three.js/blob/e3cd05d80baf7b1594352a1d7e464c6d188b0080/examples/jsm/controls/OrbitControls.js
		if (this.isPerspective) {
			const pointer = new THREE.Vector3(p.x, p.y, 0.5);
			pointer.unproject(this.instance);
			pointer.sub(this.instance.position).normalize();
			const dist =
				target.clone().sub(this.perspectiveCamera.position).dot(this.perspectiveCamera.up) /
				pointer.dot(this.perspectiveCamera.up);
			return this.instance.position.clone().add(pointer.multiplyScalar(dist));
		} else {
			const pointer = new THREE.Vector3(
				p.x,
				p.y,
				(this.orthographicCamera.near + this.orthographicCamera.far) /
					(this.orthographicCamera.near - this.orthographicCamera.far)
			);
			pointer.unproject(this.orthographicCamera);
			pointer.y -= target.y;
			const v = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orthographicCamera.quaternion);
			const dist = -pointer.dot(this.orthographicCamera.up) / v.dot(this.orthographicCamera.up);
			const result = pointer.clone().add(v.multiplyScalar(dist));
			return result;
		}
	}

	setPosition(target: THREE.Vector3) {
		const oldTarget = this.controls.target.clone();
		const diff = target.clone().sub(oldTarget);
		const t = (taro?.game?.data?.settings?.camera?.trackingDelay || 3) / taro.fps();
		this.controls.target.lerp(this.controls.target.clone().add(diff), t);
		this.orthographicCamera.position.lerp(this.orthographicCamera.position.clone().add(diff), t);
		this.perspectiveCamera.position.lerp(this.perspectiveCamera.position.clone().add(diff), t);
	}

	onChange(cb: () => void) {
		this.onChangeCbs.push(cb);
	}

	private switchToOrthographicCamera() {
		this.orthographicCamera.position.copy(this.perspectiveCamera.position);
		this.orthographicCamera.quaternion.copy(this.perspectiveCamera.quaternion);

		const aspect = this.perspectiveCamera.aspect;
		const fovY = this.perspectiveCamera.fov;
		const distance = this.perspectiveCamera.position.distanceTo(this.controls.target);

		const halfHeight = Math.tan(fovY * (Math.PI / 180) * 0.5) * distance;
		const halfWidth = halfHeight * aspect;

		this.orthographicCamera.left = -halfWidth;
		this.orthographicCamera.right = halfWidth;
		this.orthographicCamera.top = halfHeight;
		this.orthographicCamera.bottom = -halfHeight;

		this.orthographicCamera.zoom = 1; // don't touch. makes sure camera seamless transition between pers/ortho when zoomed.
		this.orthographicCamera.lookAt(this.controls.target);
		this.orthographicCamera.updateProjectionMatrix();
		this.instance = this.orthographicCamera;
		this.controls.object = this.orthographicCamera;
		this.instance.lookAt(this.controls.target);
		this.controls.update();
	}

	private switchToPerspectiveCamera() {
		this.perspectiveCamera.position.copy(this.orthographicCamera.position);
		this.perspectiveCamera.quaternion.copy(this.orthographicCamera.quaternion);

		const yFovDeg = this.perspectiveCamera.fov * (Math.PI / 180);
		const distance = this.orthographicCamera.top / Math.tan(yFovDeg * 0.5) / this.orthographicCamera.zoom;
		const newPos = new THREE.Vector3()
			.subVectors(this.perspectiveCamera.position, this.controls.target)
			.normalize()
			.multiplyScalar(distance)
			.add(this.controls.target);

		this.perspectiveCamera.position.copy(newPos);
		this.perspectiveCamera.updateProjectionMatrix();
		this.instance = this.perspectiveCamera;
		this.controls.object = this.perspectiveCamera;
		this.instance.lookAt(this.controls.target);
		this.controls.update();
	}
}
