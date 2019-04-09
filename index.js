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

function check_firmware() {
    if (fs.existsSync('tmp/firmware-update') || fs.existsSync('tmp/META-INF/com/google/android/update-binary') || fs.existsSync('tmp/META-INF/com/google/android/updater-script')) {
        return true;
    }
    return false;
}

function firmware_updater() {
    let output = 'out/updater-script';
    fs.writeFileSync(output, 'show_progress(0.200000, 10);' + '\n');
    fs.appendFileSync(output, '# Generated by Xiaomi Flashable Firmware Creator' + '\n'
        + '# ' + 'today' + ' - ' + 'host' + '\n' + '\n'); // TODO
    fs.appendFileSync(output, 'ui_print("Flashing Normal firmware...");' + '\n');

    // o.writelines(line for line in i if "getprop" in line or "Target" in line or "firmware-update" in line)
    let lineReader = require('readline').createInterface({
        input: fs.createReadStream('tmp/META-INF/com/google/android/updater-script')
    });

    lineReader.on('line', (line) => {
        if (line.indexOf('getprop') > -1 || line.indexOf('Target') > -1 || line.indexOf('firmware-update') > -1) {
            fs.appendFileSync(output, line);
        }
    });

    fs.appendFileSync(output, '\n' + 'show_progress(0.100000, 2);' + '\n' + 'set_progress(1.000000);' + '\n');

    let correct = fs.readFileSync('out/updater-script');
    correct = correct.replace('/firmware/image/sec.dat', '/dev/block/bootdevice/by-name/sec')
        .replace('/firmware/image/splash.img', '/dev/block/bootdevice/by-name/splash');

    fs.writeFileSync('out/META-INF/com/google/android/updater-script', correct);
    fs.removeSync('vout/updater-script');
}

function make_zip() {
    let zip = new AdmZip();
    zip.addLocalFolder('out/', '');

    let buffer = zip.toBuffer();
    zip.writeZip('firmware.zip');

    if (fs.existsSync('firmware.zip')) {
        console.log('All done!');
        fs.removeSync('tmp/');
        fs.removeSync('out/');
    } else {
        console.log('Failed!' + '\n' + 'Check out folder!');
    }
}

function firmware_extract() {
    if (process === 'firmware') {
        let zip = new AdmZip(rom);
        const zipEntries = zip.getEntries();
        zipEntries.forEach((zipEntry) => {
            if (zipEntry.entryName.startsWith('firmware-update/') || zipEntry.entryName.startsWith('META-INF/')) {
                zip.extractAllTo('tmp', true);
            }
        });
    } else if (process == 'nonarb') {
        let zip = new AdmZip(rom);
        const zipEntries = zip.getEntries();
        zipEntries.forEach((zipEntry) => {
            if (zipEntry.entryName.startsWith('firmware-update/dspso.bin')
                || zipEntry.entryName.startsWith('firmware-update/BTFM.bin')
                || zipEntry.entryName.startsWith('firmware-update/NON-HLOS.bin')
                || zipEntry.entryName.startsWith('META-INF/')) {
                zip.extractAllTo('tmp', true);
            }
        });
    }

    if (check_firmware()) {
        fs.renameSync('tmp/firmware-update/', 'out/firmware-update/');
        fs.renameSync('tmp/META-INF/com/google/android/update-binary', 'out/META-INF/com/google/android/');
    } else {
        fs.removeSync('tmp');
        throw new Error('This zip doesn\'t contain firmware directory.');
    }
}

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
        firmware_extract();
        console.log("Generating updater-script..")
        firmware_updater();
    }
    else if (process == "nonarb") {
        console.log("Unzipping MIUI..")
        firmware_extract();
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
    make_zip();
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