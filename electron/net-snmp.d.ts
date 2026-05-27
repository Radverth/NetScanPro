declare module 'net-snmp' {
  export interface VarBind {
    oid: string
    value: unknown
    type?: number
  }

  export interface SessionOptions {
    version?: number
    timeout?: number
    retries?: number
    port?: number
  }

  export interface Session {
    get(
      oids: string[],
      callback: (error: Error | null, varbinds: VarBind[]) => void,
    ): void
    walk(
      oid: string,
      maxRepetitions: number,
      feedCallback: (vb: VarBind) => void,
      doneCallback: (error: Error | null) => void,
    ): void
    close(): void
  }

  export const Version2c: number

  export function createSession(
    target: string,
    community: string,
    options?: SessionOptions,
  ): Session

  export function isVarbindError(varbind: VarBind): boolean
}
