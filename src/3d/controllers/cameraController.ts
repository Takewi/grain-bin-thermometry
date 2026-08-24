import { Scene, ArcRotateCamera, Vector3, Animation, CubicEase } from "@babylonjs/core";
import { CAMERA_CONFIG } from "../constants";
import type { StorageType } from "@/types/storage";

export type CameraPresetType = "iso" | "top" | "front" | "side";

export class CameraController {
	public camera: ArcRotateCamera;
	private scene: Scene;
	public isAutoRotating = false;
	public currentPreset: CameraPresetType = "iso";

	constructor(scene: Scene, canvas: HTMLCanvasElement) {
		this.scene = scene;
		const { MACRO, PHYSICS } = CAMERA_CONFIG;

		this.camera = new ArcRotateCamera(
			"mainCam",
			MACRO.ALPHA,
			MACRO.BETA,
			MACRO.RADIUS,
			MACRO.TARGET,
			this.scene
		);

		this.camera.attachControl(canvas, true);

		// Aplicação das físicas configuradas
		this.camera.inertia = PHYSICS.INERTIA;
		this.camera.wheelDeltaPercentage = PHYSICS.WHEEL_DELTA_PERCENTAGE;
		this.camera.pinchDeltaPercentage = PHYSICS.PINCH_DELTA_PERCENTAGE;
		this.camera.panningSensibility = PHYSICS.PANNING_SENSIBILITY;
		this.camera.panningDistanceLimit = PHYSICS.UPPER_RADIUS_LIMIT;
		this.camera.angularSensibilityX = PHYSICS.ANGULAR_SENSIBILITY_X;
		this.camera.angularSensibilityY = PHYSICS.ANGULAR_SENSIBILITY_Y;
		this.camera.lowerRadiusLimit = PHYSICS.LOWER_RADIUS_LIMIT;
		this.camera.upperRadiusLimit = PHYSICS.UPPER_RADIUS_LIMIT;
		this.camera.lowerBetaLimit = PHYSICS.LOWER_BETA_LIMIT;
		this.camera.upperBetaLimit = PHYSICS.UPPER_BETA_LIMIT;
		this.camera.allowUpsideDown = false;
	}

	/**
	 * Animação cinemática genérica com interpolação CubicEase
	 */
	public animateTo(params: {
		target?: Vector3;
		radius?: number;
		alpha?: number;
		beta?: number;
		duration?: number;
	}): void {
		const ease = new CubicEase();
		ease.setEasingMode(CubicEase.EASINGMODE_EASEOUT);
		const duration = params.duration || CAMERA_CONFIG.ANIMATION.DEFAULT_DURATION;

		if (params.target) {
			Animation.CreateAndStartAnimation(
				"camTargetAnim",
				this.camera,
				"target",
				60,
				duration,
				this.camera.target,
				params.target,
				Animation.ANIMATIONLOOPMODE_CONSTANT,
				ease
			);
		}

		if (params.radius !== undefined) {
			Animation.CreateAndStartAnimation(
				"camRadiusAnim",
				this.camera,
				"radius",
				60,
				duration,
				this.camera.radius,
				params.radius,
				Animation.ANIMATIONLOOPMODE_CONSTANT,
				ease
			);
		}

		if (params.alpha !== undefined) {
			let currentAlpha = this.camera.alpha;
			let targetAlpha = params.alpha;
			while (targetAlpha - currentAlpha > Math.PI) targetAlpha -= Math.PI * 2;
			while (targetAlpha - currentAlpha < -Math.PI) targetAlpha += Math.PI * 2;

			Animation.CreateAndStartAnimation(
				"camAlphaAnim",
				this.camera,
				"alpha",
				60,
				duration,
				currentAlpha,
				targetAlpha,
				Animation.ANIMATIONLOOPMODE_CONSTANT,
				ease
			);
		}

		if (params.beta !== undefined) {
			Animation.CreateAndStartAnimation(
				"camBetaAnim",
				this.camera,
				"beta",
				60,
				duration,
				this.camera.beta,
				params.beta,
				Animation.ANIMATIONLOOPMODE_CONSTANT,
				ease
			);
		}
	}

	/**
	 * Transição suave para um preset de visualização
	 */
	public setPreset(
		preset: CameraPresetType,
		isFocused: boolean = false,
		storageType?: StorageType
	): void {
		this.currentPreset = preset;
		const { MACRO, FOCUS_RADIUS } = CAMERA_CONFIG;
		const focusDist = storageType === "WAREHOUSE" ? FOCUS_RADIUS.WAREHOUSE : FOCUS_RADIUS.SILO;

		switch (preset) {
			case "iso":
				this.animateTo({
					alpha: MACRO.ALPHA,
					beta: MACRO.BETA,
					radius: isFocused ? focusDist : MACRO.RADIUS,
				});
				break;

			case "top": // Planta Superior (Zenital / 2D)
				this.animateTo({
					alpha: -Math.PI / 2,
					beta: 0.01,
					radius: isFocused ? FOCUS_RADIUS.TOP_VIEW : MACRO.RADIUS * 1.05,
				});
				break;

			case "front": // Vista Frontal
				this.animateTo({
					alpha: -Math.PI / 2,
					beta: Math.PI / 2.2,
					radius: isFocused ? focusDist : MACRO.RADIUS,
				});
				break;

			case "side": // Vista Lateral
				this.animateTo({
					alpha: 0,
					beta: Math.PI / 2.2,
					radius: isFocused ? focusDist : MACRO.RADIUS,
				});
				break;
		}
	}

	/**
	 * Aproxima o zoom suavemente
	 */
	public zoomIn(): void {
		const targetRadius = Math.max(
			CAMERA_CONFIG.PHYSICS.LOWER_RADIUS_LIMIT,
			this.camera.radius * 0.72
		);
		this.animateTo({ radius: targetRadius, duration: CAMERA_CONFIG.ANIMATION.FAST_DURATION });
	}

	/**
	 * Afasta o zoom livremente
	 */
	public zoomOut(): void {
		const targetRadius = this.camera.radius * 1.45;
		this.animateTo({ radius: targetRadius, duration: CAMERA_CONFIG.ANIMATION.FAST_DURATION });
	}

	/**
	 * Foca a câmera em um silo/graneleiro específico
	 */
	public focusOnStorage(position: Vector3, height: number, type: StorageType): void {
		if (this.isAutoRotating) {
			this.setAutoRotate(false);
		}

		const targetPos = new Vector3(position.x, height * 0.45, position.z);
		const targetRadius =
			type === "WAREHOUSE" ? CAMERA_CONFIG.FOCUS_RADIUS.WAREHOUSE : CAMERA_CONFIG.FOCUS_RADIUS.SILO;

		this.animateTo({
			target: targetPos,
			radius: targetRadius,
			duration: CAMERA_CONFIG.ANIMATION.DEFAULT_DURATION,
		});
	}

	/**
	 * Retorna a câmera para a visão panorâmica macro da planta
	 */
	public resetToMacro(): void {
		this.currentPreset = "iso";
		const { MACRO, ANIMATION } = CAMERA_CONFIG;

		this.animateTo({
			target: MACRO.TARGET,
			radius: MACRO.RADIUS,
			alpha: MACRO.ALPHA,
			beta: MACRO.BETA,
			duration: ANIMATION.RESET_DURATION,
		});
	}

	/**
	 * Alterna a auto-rotação em torno do foco
	 */
	public setAutoRotate(active: boolean): void {
		this.isAutoRotating = active;
		this.camera.useAutoRotationBehavior = active;
		if (active && this.camera.autoRotationBehavior) {
			const { AUTO_ROTATE } = CAMERA_CONFIG;
			this.camera.autoRotationBehavior.idleRotationSpeed = AUTO_ROTATE.SPEED;
			this.camera.autoRotationBehavior.idleRotationWaitTime = AUTO_ROTATE.WAIT_TIME;
			this.camera.autoRotationBehavior.idleRotationSpinupTime = AUTO_ROTATE.SPINUP_TIME;
		}
	}

	public toggleAutoRotate(): void {
		this.setAutoRotate(!this.isAutoRotating);
	}
}
