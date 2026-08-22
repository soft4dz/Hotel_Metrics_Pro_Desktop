import Electron from'../lib/electronApi';import{wrapIpc,wrapIpcAsync}from'./ipcHelpers';import*as hardware from'../services/hardware.service';
export function registerHardwareIpc(){
  Electron.ipcMain.handle('hardware:dashboard',(e,hotelId:number)=>wrapIpc(e,uid=>hardware.hardwareDashboard(uid,hotelId)));
  Electron.ipcMain.handle('hardware:devices:list',(e,hotelId:number)=>wrapIpc(e,uid=>hardware.listDevices(uid,hotelId)));
  Electron.ipcMain.handle('hardware:devices:save',(e,input)=>wrapIpc(e,uid=>hardware.saveDevice(uid,input)));
  Electron.ipcMain.handle('hardware:commands:queue',(e,input)=>wrapIpc(e,uid=>hardware.queueCommand(uid,input)));
  Electron.ipcMain.handle('hardware:commands:next',(e,hotelId:number,limit?:number)=>wrapIpc(e,uid=>hardware.nextCommands(uid,hotelId,limit)));
  Electron.ipcMain.handle('hardware:commands:dispatch',(e,id:number)=>wrapIpcAsync(e,uid=>hardware.dispatchCommand(uid,id)));
  Electron.ipcMain.handle('hardware:commands:logs',(e,hotelId:number,deviceId?:number)=>wrapIpc(e,uid=>hardware.commandLogs(uid,hotelId,deviceId)));
  Electron.ipcMain.handle('hardware:payments:start',(e,input)=>wrapIpc(e,uid=>hardware.startPayment(uid,input)));
  Electron.ipcMain.handle('hardware:payments:reverse',(e,id:number,operation:'remboursement'|'annulation',amount?:number)=>wrapIpc(e,uid=>hardware.reversePayment(uid,id,operation,amount)));
  Electron.ipcMain.handle('hardware:payments:list',(e,hotelId:number)=>wrapIpc(e,uid=>hardware.listPayments(uid,hotelId)));
  Electron.ipcMain.handle('hardware:keys:issue',(e,input)=>wrapIpc(e,uid=>hardware.issueRoomKey(uid,input)));
  Electron.ipcMain.handle('hardware:keys:revoke',(e,id:number)=>wrapIpc(e,uid=>hardware.revokeRoomKey(uid,id)));
  Electron.ipcMain.handle('hardware:keys:list',(e,hotelId:number)=>wrapIpc(e,uid=>hardware.listRoomKeys(uid,hotelId)));
  Electron.ipcMain.handle('hardware:pbx:ingest',(e,input)=>wrapIpc(e,uid=>hardware.ingestPbxCall(uid,input)));
  Electron.ipcMain.handle('hardware:pbx:list',(e,hotelId:number)=>wrapIpc(e,uid=>hardware.listPbxCalls(uid,hotelId)));
  Electron.ipcMain.handle('hardware:iptv:set',(e,input)=>wrapIpc(e,uid=>hardware.setIptvAccess(uid,input)));
  Electron.ipcMain.handle('hardware:scanner:capture',(e,input)=>wrapIpc(e,uid=>hardware.captureScan(uid,input)));
  Electron.ipcMain.handle('hardware:fiscal:print',(e,input)=>wrapIpc(e,uid=>hardware.queueFiscalPrint(uid,input)));
}
