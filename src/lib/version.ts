declare const __APP_VERSION__: string

/** "1.0.0" from package.json. */
export const APP_VERSION = __APP_VERSION__

/** What people see: "1" for 1.0.x, "1.1" for 1.1.x; patch numbers stay out of the interface. */
export const APP_VERSION_LABEL = APP_VERSION.split('.').slice(0, 2).join('.').replace(/\.0$/, '')
