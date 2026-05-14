declare module "@garmin/fitsdk" {
  export const Profile: {
    MesgNum: {
      FILE_ID: number
      DEVICE_INFO: number
      SESSION: number
      ACTIVITY: number
      RECORD: number
    }
  }

  export class Encoder {
    onMesg(messageNumber: number, values: Record<string, unknown>): void
    close(): Uint8Array
  }
}
