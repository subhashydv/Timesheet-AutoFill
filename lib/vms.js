const path = process.argv[1].split("lib/vms.js")[0] + ".env";
require('dotenv').config({ path })
const { openBrowser, goto, click, closeBrowser, write, text, into, textBox, below, press, dropDown } = require('taiko');
const { exec } = require('child_process');
const fs = require('fs');

const { VMS_URL, VMS_USERNAME, VMS_PASSWORD, PROJECT, TASK, COMMENT } = process.env
const IN_TIME_REGEX = /In-Time: \d{1,2}:\d{2}/

const getDate = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  return currentYear + "-" + currentMonth + "-" + currentDay;
}

const updatePassword = async () => {
  const script = `set userInput to text returned of (display dialog "❌ VMS automation tool is not able to LOG IN! \n\n[NOTE] Incase you have changed vms password. Then please update your new password below.\n\nPlease enter new password : " with title "⚠️ VMS LOGIN ERROR" default answer "")`;

  exec(`osascript -e '${script}'`, async (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    if (stdout.trim()) {
      const envVariables = fs.readFileSync(path, 'utf-8');
      const lines = envVariables.split('\n');
      const newLines = lines.map(line =>
        line.startsWith('VMS_PASSWORD') ? `VMS_PASSWORD=${stdout.trim()}` : line
      )
      fs.writeFileSync(path, newLines.join('\n'), 'utf-8');
      console.log('new lines are : ', newLines.join('\n'));
    }
    return await closeBrowser();
  });
}

const isLoginFailed = async () => await text("Authentication Failed").exists();

const vmsLogIn = async () => {
  await openBrowser({ headless: true });
  await goto(VMS_URL);
  await write(VMS_USERNAME, into(textBox({ placeholder: "TP ID /EMP ID" })));
  await write(VMS_PASSWORD, into(textBox({ placeholder: "******" })));
  return await click('Log In');
}

async function closePopUp() {
  await click("OK", into({ id: "popup_ok" }));
  return await click("OK", into({ id: "popup_ok" }));
}

async function doCheckIn() {
  await click("Check-In");
  return await closePopUp();
}

async function doCheckOut() {
  await click("Check-out");
  return await closePopUp();
}

async function fillTimeSheet() {
  await click('TimeSheet', below('Dashboard'));
  await write(getDate(), into(textBox({ id: 'activityDate', placeholder: "MM/DD/YYYY" })));
  await press('Enter');
  await click("Please select Project");
  await click(PROJECT);
  await dropDown('', below('Task')).select(TASK);
  await dropDown('', below('Start Time')).select('10:00');
  await dropDown('', below('End Time')).select('18:30');
  await write(COMMENT, into(textBox({ id: 'comment_1', placeholder: "Enter Comment" })));
  return await click('Submit');
};

async function verifyAndFillTimeSheet() {
  await click('TimeSheet', below('Dashboard'));
  await click('View Timesheet');
  if (!await text(getDate).exists) {
    return await fillTimeSheet();
  };
  return;
}

async function fillVmsTasks() {
  try {
    await vmsLogIn();
    if (!await text(IN_TIME_REGEX).exists()) {
      await doCheckIn();
      await doCheckOut();
      await fillTimeSheet();
    } else {
      await doCheckOut();
      await verifyAndFillTimeSheet();
    }
  } catch (error) {
    console.error('error is : ', error);
  } finally {
    await closeBrowser();
  }
}

function displayDialogAndFillTasks() {
  const script = `display dialog "VMS automation tool will do following :\n1. Check-In\n2. Check-Out\n3. Fill timesheet\n\nPlease agree to continue..." with title "Your VMS Check-In is Pending" buttons {"OK", "Cancel"}`;

  exec(`osascript -e '${script}'`, async (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stdout.includes('OK')) {
      console.log("here we go...")
      await fillVmsTasks();
    }
  });
}

async function main() {
  try {
    await vmsLogIn();
    if (await isLoginFailed()) {
      return await updatePassword();
    }
    const isCheckedIn = await text(IN_TIME_REGEX).exists()
    await closeBrowser();
    if (!isCheckedIn) {
      displayDialogAndFillTasks();
    } else {
      await fillVmsTasks();
      await closeBrowser();
    }
  } catch (error) {
    console.error('error', error);
    closeBrowser();
  }
}

main();
