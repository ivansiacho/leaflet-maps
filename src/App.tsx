import "./styles.css";
import "../node_modules/leaflet/dist/leaflet.css";
import L from "leaflet";
import { ccFloorplan } from "./images";
import * as pdfjs from "pdfjs-dist";
import * as workerjs from "pdfjs-dist/build/pdf.worker";


fetch("test.txt")
  .then((response) => response.text())
  .then((text) => {
    console.log("fetch", text);
  });

console.log(workerjs);
// pdfjs.GlobalWorkerOptions.workerSrc = "https://d2v5g.csb.app/pdf.worker.js";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

const markersUrl = "markers-test.xfdf";
// const markersUrl = "s3://crowdcomfortfloorplans-qa/floorplan/642ed07178f194a0c03768f9/markers.xfdf";
// const markersUrl = "https://crowdcomfortfloorplans-qa.s3.amazonaws.com//floorplan/642ed07178f194a0c03768f9/markers.xfdf"; 
// const markersUrl = "https://crowdcomfortfloorplans-qa.s3.amazonaws.com//floorplan/642ed07178f194a0c03768f9/markers.xfdf?AWSAccessKeyId=AKIAWSW2UU3UI4BS7BG7&Signature=7573Gfp9lMa8Uc0hB7FzqmAjjdE%3D&Expires=1701732787";

const floorplanUrl = "floorplan-test.pdf";
// const floorplanUrl = "s3://crowdcomfortfloorplans-qa/floorplan/642ed07178f194a0c03768f9/floorplan.pdf";
// const flooplanUrl = "https://crowdcomfortfloorplans-qa.s3.amazonaws.com//floorplan/642ed07178f194a0c03768f9/floorplan.pdf";
// const flooplanUrl = "https://crowdcomfortfloorplans-qa.s3.amazonaws.com//floorplan/642ed07178f194a0c03768f9/floorplan.pdf?AWSAccessKeyId=AKIAWSW2UU3UI4BS7BG7&Signature=L4nqYelzIeYRC9mqSr8yYhih1zQ%3D&Expires=1701732787";

fetch(markersUrl)
  .then((response) => response.text())
  .then((response) => {
    console.log(response);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response, "text/xml");

    // Extract annotations from XML document
    const annotations = [];
    const annotationElements: any = xmlDoc.getElementsByTagName("text");

    for (let annotationElement of annotationElements) {
      const annotationData = {
        rect: annotationElement.getAttribute("rect"),
        color: annotationElement.getAttribute("color"),
        date: annotationElement.getAttribute("date"),
        name: annotationElement.getElementsByTagName("span")[0].innerText,
      };

      annotations.push(annotationData);
    }

    console.log(annotations);

    const loadPdf = async (annotations) => {
      const loadingTask = pdfjs.getDocument(floorplanUrl);
      const pdf = await loadingTask.promise;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });

      console.log(pdf);
      console.log(firstPage.render);
      console.log(viewport);

      const map = L.map("map", {
        crs: L.CRS.Simple,
        minZoom: 0,
      });
      const bounds = [
        [0, 0],
        [viewport.height, viewport.width],
      ];

      const canvas = L.DomUtil.create("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      await firstPage.render({
        intent: "print",
        background: "transparent",
        canvasContext: context,
        viewport
      });
      const firstPageImage = canvas;

      const image = L.imageOverlay(firstPageImage.toDataURL(), bounds);
      image.addTo(map);
      map.fitBounds(bounds);

      const myIcon = L.divIcon({ className: "marker-icon" });
      annotations.map((marker) => {
        const locations = marker.rect.split(",");
        const position = [locations[1], locations[0]];
        const markerMap = L.marker(position, { icon: myIcon });
        markerMap.addTo(map);
        markerMap.bindPopup(`<p>${marker.name}</p>${position}`);
      });
    };

    loadPdf(annotations)

  });

export default function App() {
  return (
    <div className="App">
      <div className="map-container">
        <div id="map"></div>
      </div>
    </div>
  );
}
