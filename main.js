const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, globalShortcut, Menu, ipcMain, dialog } = require('electron');

let win;
let second_win;
let current_file;

function save(save_as)
{
    let path;

    if (save_as) {
        path = dialog.showSaveDialogSync(win, {
            filters: [{
                name: 'JSON', 
                extensions: [ 'json' ]
            }],
            properties: [
                'showOverwriteConfirmation'
            ]
        });
    } else {
        path = current_file;
    }

    if (!path)
        return;

    ipcMain.once('reply_splits', (e, splits) => {
        let json = {};
        json.splits = [];

        for (var i = 0; i < splits.length; i++) {
            json.splits.push({
                name: splits[i]
            });
        }

        fs.writeFile(path, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                console.log(err);
            }
        });
    });
    win.webContents.send('fromMain', { event: 'reply_splits' });
}

function open()
{
    const path = dialog.showOpenDialogSync(win, {
        filters: [{
            name: 'JSON',
            extensions: ['json']
        }],
        properties: [
            'openFile'
        ]
    });

    if (!path)
        return;
    current_file = path;

    const json = JSON.parse(fs.readFileSync(path[0]));
    win.webContents.send('fromMain', { event: 'new_splits', splits: json.splits.map(x => x.name) });
}

async function editSplitsWindow()
{
    if (second_win) {
        second_win.focus();
        return;
    }

    second_win = new BrowserWindow({
        width: 450,
        height: 350,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.resolve(__dirname, 'preload.js')
        },
        parent: win
    });

    second_win.on('closed', () => {
        second_win = null;
    });

    second_win.once('ready-to-show', () => {
        second_win.show();
    });

    second_win.setMenuBarVisibility(false);
    second_win.loadFile(path.resolve(__dirname, 'public', 'html', 'edit.html'));
    // second_win.webContents.openDevTools();
}

async function createWindow()
{
    win = new BrowserWindow({
        width: 450,
        height: 650,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.resolve(__dirname, 'preload.js')
        },
        icon: path.resolve(__dirname, 'build', 'icon.png')
    });

    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New...',
                    click() { },
                    accelerator: 'CmdOrCtrl+N'
                },
                {
                    label: 'Open...',
                    click() { open() },
                    accelerator: 'CmdOrCtrl+O'
                },
                {
                    label: 'Save',
                    click() { save(false) },
                    accelerator: 'CmdOrCtrl+S'
                },
                {
                    label: 'Save As...',
                    click() { save(true) },
                    accelerator: 'CmdOrCtrl+Shift+S'
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    click() { app.quit() },
                    accelerator: 'CmdOrCtrl+Q'
                },
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Edit Splits...',
                    click() { editSplitsWindow() },
                    accelerator: 'CmdOrCtrl+Shift+E'
                },
                {
                    label: 'Clear PB',
                    click() { }
                }
            ]
        }
    ]
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    win.loadFile(path.resolve('public', 'html', 'index.html'));
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
    
    const ret = globalShortcut.register('num0', () => {
        win.webContents.send('fromMain', { event: "hotkey" });
    });
    
    if (!ret)
        console.log("Could not register hotkey");
});

ipcMain.on('toMain', (e, args) => {
    switch (args.event) {
        case 'save': {
            const arr = args.data;
            console.log(arr);
            win.webContents.send('fromMain', { event: 'new_splits', splits: arr });
            break;
        }

        case 'final': {

            break;
        }
    }
});