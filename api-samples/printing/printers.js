// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function onPrintButtonClicked(printerId, dpi) {
  var ticket = {
    version: '1.0',
    print: {
      color: {type: 'STANDARD_MONOCHROME'},
      duplex: {type: 'NO_DUPLEX'},
      page_orientation: {type: 'LANDSCAPE'},
      copies: {copies: 1},
      dpi: {horizontal_dpi: dpi.horizontal_dpi, vertical_dpi: dpi.vertical_dpi},
      media_size: {
        width_microns: 210000,
        height_microns: 297000,
        vendor_id: 'iso_a4_210x297mm'
      },
      collate: {collate: false}
    }
  };

  fetch('test.pdf')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const request = {
          job: {
            printerId: printerId,
            title: 'test job',
            ticket: ticket,
            contentType: 'application/pdf',
            document: new Blob(
                [new Uint8Array(arrayBuffer)], {type: 'application/pdf'})
          }
        };
        chrome.printing.submitJob(request, (response) => {
          if (response !== undefined) {
            console.log(response.status);
          }
          if (chrome.runtime.lastError !== undefined) {
            console.log(chrome.runtime.lastError.message);
          }
          window.scrollTo(0, document.body.scrollHeight);
        });
      });
}

function onCancelButtonClicked(jobId) {
  chrome.printing.cancelJob(jobId).then((response) => {
    if (response !== undefined) {
      console.log(response.status);
    }
    if (chrome.runtime.lastError !== undefined) {
      console.log(chrome.runtime.lastError.message);
    }
  });
}

function createButton(label, onClicked) {
  const button = document.createElement('button');
  button.innerHTML = label;
  button.onclick = onClicked;
  return button;
}

function createPrintersTable() {
  chrome.printing.getPrinters().then((printers) => {
    const tbody = document.createElement('tbody');
    printers.forEach(printer => {
      chrome.printing.getPrinterInfo(printer.id).then((printerInfo) => {
        const columnValues = [
          printer.id,
          printer.name,
          printer.description,
          printer.uri,
          printer.source,
          printer.isDefault,
          printer.recentlyUsedRank,
          JSON.stringify(printerInfo.capabilities),
          printerInfo.status,
        ];

        let tr = document.createElement('tr');
        for (const columnValue of columnValues) {
          const td = document.createElement('td');
          td.appendChild(document.createTextNode(columnValue));
          td.setAttribute('align', 'center');
          tr.appendChild(td);
        }

        const printTd = document.createElement('td');
        printTd.appendChild(createButton('Print', function() {
          onPrintButtonClicked(
              printer.id, printerInfo.capabilities.printer.dpi.option[0]);
        }));
        tr.appendChild(printTd);

        tbody.appendChild(tr);
      });
    });
    const table = document.getElementById('printersTable');
    table.appendChild(tbody);
  });
  chrome.printing.onJobStatusChanged.addListener((jobId, status) => {
    console.log("jobId: " + jobId + ", status: " + status);
    let jobTr = document.getElementById(jobId);
    if (jobTr == undefined) {
      jobTr = document.createElement("tr");
      jobTr.setAttribute("id", jobId);
      const jobIdTd = document.createElement('td');
      jobIdTd.appendChild(document.createTextNode(jobId));
      jobTr.appendChild(jobIdTd);
      let jobStatusTd = document.createElement('td');
      jobStatusTd.setAttribute("id", jobId + "-status");
      jobStatusTd.appendChild(document.createTextNode(status));
      jobTr.appendChild(jobStatusTd);

      const cancelTd = document.createElement('td');
      let cancelBtn = createButton('Cancel', function() {
        onCancelButtonClicked(jobId);
      })
      cancelBtn.setAttribute("id", jobId + "-cancelBtn");
      cancelTd.appendChild(cancelBtn);
      jobTr.appendChild(cancelTd);
      document.getElementById("printJobTbody").appendChild(jobTr);
    } else {
      document.getElementById(jobId + "-status").innerHTML = status;
      if (status !== "PENDDING" && status !== "IN_PROGRESS") {
        document.getElementById(jobId + "-cancelBtn").style.visibility = 'hidden';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  createPrintersTable();
});