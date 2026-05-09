class TempEffectsAsStatuses {
  static MODULE_NAME = "temp-effects-as-statuses";
  static MODULE_TITLE = "Temporary Effects as Token Statuses";

  static SETTINGS = {
    toggleDelete: 'toggle-delete',
  };

  static TOGGLE_MODES = {
    ALWAYS_DELETE: "always-delete",
    ALWAYS_KEEP: "always-keep",
    DEFAULT: "default",
  };

  static log(...args) {
    if (game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.MODULE_NAME)) {
      console.log(this.MODULE_TITLE, '|', ...args);
    }
  }

  static registerSettings() {
    game.settings.register(this.MODULE_NAME, this.SETTINGS.toggleDelete, {
      name: `${this.MODULE_NAME}.settings.${this.SETTINGS.toggleDelete}.name`,
      hint: `${this.MODULE_NAME}.settings.${this.SETTINGS.toggleDelete}.hint`,
      config: true,
      scope: 'world',
      default: this.TOGGLE_MODES.DEFAULT,
      type: String,
      choices: {
        [this.TOGGLE_MODES.DEFAULT]: `${this.MODULE_NAME}.settings.${this.SETTINGS.toggleDelete}.options.${this.TOGGLE_MODES.DEFAULT}`,
        [this.TOGGLE_MODES.ALWAYS_DELETE]: `${this.MODULE_NAME}.settings.${this.SETTINGS.toggleDelete}.options.${this.TOGGLE_MODES.ALWAYS_DELETE}`,
        [this.TOGGLE_MODES.ALWAYS_KEEP]: `${this.MODULE_NAME}.settings.${this.SETTINGS.toggleDelete}.options.${this.TOGGLE_MODES.ALWAYS_KEEP}`,
      },
    });
  }
}

Hooks.on('init', () => {
  console.log(`${TempEffectsAsStatuses.MODULE_NAME} | Initializing ${TempEffectsAsStatuses.MODULE_TITLE}`);
  TempEffectsAsStatusesTokenHUD.init();
  TempEffectsAsStatuses.registerSettings();
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(TempEffectsAsStatuses.MODULE_NAME);
});

class TempEffectsAsStatusesTokenHUD {
  static init() {
    Hooks.on('renderTokenHUD', this.onRenderHUD.bind(this));
  }

  static onRenderHUD(app, element, data) {
    const token = app?.object;
    if (!token?.actor) return;

    const statusEffectsEl = element.querySelector('.status-effects');
    if (!statusEffectsEl) return;

    // Filter out core status effects
    const filteredEffects = token.actor.temporaryEffects.filter(effect => {
      return !CONFIG.statusEffects.some(statusEffect =>
        statusEffect.img === effect.img && effect.statuses?.has(statusEffect.id)
      );
    });

    for (const effect of filteredEffects) {
      const img = document.createElement('img');
      img.classList.add('effect-control', 'active');
      img.dataset.effectUuid = effect.uuid;
      img.src = effect.icon || effect.img;
      img.title = effect.name;
      // img.dataset.statusId = effect.uuid;
      img.addEventListener('click', this.onClickEffect.bind(this));
      statusEffectsEl.appendChild(img);
    }

    TempEffectsAsStatuses.log('Added temporary effects:', filteredEffects);
  }

  static async onClickEffect(event) {
    event.preventDefault();
    event.stopPropagation();

    const img = event.currentTarget;
    const uuid = img.dataset.effectUuid;
    if (!uuid) return;

    return await this.toggleEffectByUuid(uuid);
  }

  static checkDeleteEffect(effect) {
    const toggleMode = game.settings.get(
      TempEffectsAsStatuses.MODULE_NAME,
      TempEffectsAsStatuses.SETTINGS.toggleDelete
    );
    return TempEffectsAsStatuses.TOGGLE_MODES.ALWAYS_KEEP !== toggleMode && (
      +effect.statuses?.size > 0
      || TempEffectsAsStatuses.TOGGLE_MODES.ALWAYS_DELETE === toggleMode
    );
  }

  static async toggleEffectByUuid(effectUuid) {
    const effect = fromUuidSync(effectUuid);
    if (!effect) return false;

    if (TempEffectsAsStatusesTokenHUD.checkDeleteEffect(effect)) {
      await effect.delete();
    } else {
      await effect.update({ disabled: !effect.disabled });
    }

    return true;
  }
}
