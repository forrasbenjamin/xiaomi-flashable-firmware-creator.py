require('dotenv').config();

const argsv = require('yargs').usage('Usage: $0 --firmware <zip_file>').demandOption(['firmware']).argv;
const fs = require('fs-extra');
const AdmZip = require('adm-zip');

let process, rom;

function parse_args() {
    if (argsv.firmware && argsv.firmware.length) {
        process = 'firmware';
        rom = argsv.firmware;
    } else if (argsv.nonarb && argsv.nonarb.length) {
        process = 'nonarb';
        rom = argsv.nonarb;
    } else if (argsv.firmwareless && argsv.firmwareless.length) {
        process = 'firmwareless';
        rom = argsv.firmwareless;
    } else if (argsv.vendor && argsv.vendor.length) {
        process = 'vendor';
        rom = argsv.vendor;
    }

    if (!rom.endsWith('.zip')) {
        throw new TypeError('Not a .zip file!');
    }
    main();
}

const check_firmware = async () => {
    if (fs.existsSync('tmp/firmware-update') || fs.existsSync('tmp/META-INF/com/google/android/update-binary') || fs.existsSync('tmp/META-INF/com/google/android/updater-script')) {
        return true;
    }

    fs.removeSync('tmp');
    throw new Error('This zip doesn\'t contain firmware directory.');
}

const firmware_extract = async () => {
    if (process === 'firmware') {
        let zip = new AdmZip(rom);
        const zipEntries = zip.getEntries();
        zipEntries.forEach(function(zipEntry) {
            if (zipEntry.entryName.startsWith('firmware-update/') || zipEntry.entryName.startsWith('META-INF/')) {
                zip.extractAllTo('tmp', true);
            }
        });
    } else if (process == 'nonarb') {
        let zip = new AdmZip(rom);
        const zipEntries = zip.getEntries();
        zipEntries.forEach(function(zipEntry) {
            if (zipEntry.entryName.startsWith('firmware-update/dspso.bin')
                || zipEntry.entryName.startsWith('firmware-update/BTFM.bin')
                || zipEntry.entryName.startsWith('firmware-update/NON-HLOS.bin')
                || zipEntry.entryName.startsWith('META-INF/')) {
                zip.extractAllTo('tmp', true);
            }
        });
    }

    await check_firmware();
    fs.renameSync('tmp/firmware-update/', 'out/firmware-update/');
    fs.renameSync('tmp/META-INF/com/google/android/update-binary', 'out/META-INF/com/google/android/');
};

const main = async () => {
    if (!fs.existsSync('tmp')) {
        fs.mkdirSync('tmp');
    }
    if (!fs.existsSync('out')) {
        fs.mkdirSync('out');
    }
    if (!fs.existsSync('out/META-INF/com/google/android')) {
        fs.mkdirSync('out/META-INF/com/google/android', { recursive: true });
    }

    if (process == "firmware") {
        console.log("Unzipping MIUI..")
        await firmware_extract();
        console.log("Generating updater-script..")
        //firmware_updater()
    }
    else if (process == "nonarb") {
        console.log("Unzipping MIUI..")
        await firmware_extract();
        console.log("Generating updater-script..")
        //nonarb_updater()
    } else if (process == "firmwareless") {
        console.log("Unzipping MIUI..")
        //rom_extract()
        console.log("Generating updater-script..")
        //firmwareless_updater()
    } else if (process == "vendor") {
        console.log("Unzipping MIUI..")
        //vendor_extract()
        console.log("Generating updater-script..")
        //vendor_updater()
    }
    //make_zip()
}

try {
    parse_args();
} catch (e) {
    if (e instanceof TypeError) {
        console.log(e.message);
    }
    console.error(e);
    process.exit(1);
}