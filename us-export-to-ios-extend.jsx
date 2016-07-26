/*!
 * iOS Assets for Photoshop
 * =============================
 *
 * Version: 1.0.0
 * Author: Gaston Figueroa (Uncorked Studios)
 * Site: uncorkedstudios.com
 * Licensed under the MIT license
 */

// Photoshop variables
var docRef = app.activeDocument,
activeLayer = docRef.activeLayer,
activeLayer2,
mode,
size,
newWidth,
newHeight,
docName = docRef.name;

var scaleFactors = [];
scaleFactors[1] = {
	'@3x' : 3,
	'@2x' : 2,
	'@1x' : 1,
};
scaleFactors[2] = {
	'@3x' : 1.5,
	'@2x' : 1,
	'@1x' : 0.5,
};
scaleFactors[3] = {
	'@3x' : 1,
	'@2x' : 0.666,
	'@1x' : 0.333,
};

// Run main function
init();

// The other functions
function init() {
	// Hide warning popup
	app.displayDialogs = DialogModes.NO;

	// Save current ruler unit settings, so we can restore it
	var ru = app.preferences.rulerUnits;

	// Set ruler units to pixel to ensure scaling works as expected
	app.preferences.rulerUnits = Units.PIXELS;

	// Select export mode
	mode = selectMode();
	if (mode == null)
		return;

	// Select screen size of the psd file
	size = selectSize();
	if (size == null)
		return;

	if (!isDocumentNew()) {
		//try {
		if (mode == "2")
			scanLayerSets(app.activeDocument, "", app.activeDocument.name); // export all
		else if (mode == "1")
			scanLayerSets(activeLayer, "", activeLayer.name); // export selected layer recursively
		else
			return;
		//} catch (error) {}
	} else {
		alert("Please save your document before running this script.");
	}

	// Restore old ruler unit settings
	app.preferences.rulerUnits = ru;
	alert("Export finished!");
}

function selectMode() {
	var m = prompt("Please enter your export mode:"
			 + "\n  1 = Current layer and sub-layers"
			 + "\n  2 = All layers", "1");
	if (m == null)
		return null;
	if (m != "1" && m != "2")
		return selectMode();
	return m;
}

function selectSize() {
	var sizeArray = ["1", "2", "3"];
	var s = prompt("Please enter your current designed size:"
			 + "\n  1 = @1x"
			 + "\n  2 = @2x"
			 + "\n  3 = @3x", "1");
	if (s == null)
		return null;
	if (s == "" || sizeArray.join(",").indexOf(s) == -1)
		return selectSize();
	return s;
}

function scanLayerSets(_activeLayer, _directory, _filename) {
	// alert("Total subgroup = " + _activeLayer.layerSets.length);
	if (_activeLayer.layerSets.length > 0) {
		// Recursive
		for (var a = 0; a < _activeLayer.layerSets.length; a++) {
			scanLayerSets(_activeLayer.layerSets[a], _directory + "/" + _filename, _activeLayer.layerSets[a].name);
		}
	} else {
		// Export active layer
		if (_activeLayer.visible)
			saveFunc(_activeLayer, _directory, _filename);
	}
}

// Test if the document is new (unsaved)
// http://2.adobe-photoshop-scripting.overzone.net/determine-if-file-has-never-been-saved-in-javascript-t264.html

function isDocumentNew(doc) {
	// Assumes doc is the activeDocument
	cTID = function (s) {
		return app.charIDToTypeID(s);
	}
	var ref = new ActionReference();
	ref.putEnumerated(cTID("Dcmn"),
		cTID("Ordn"),
		cTID("Trgt")); // ActiveDoc
	var desc = executeActionGet(ref);
	var rc = true;
	if (desc.hasKey(cTID("FilR"))) { // FileReference
		var path = desc.getPath(cTID("FilR"));

		if (path) {
			rc = (path.absoluteURI.length == 0);
		}
	}
	return rc;
};

function resizeDoc(document, scale) {
	var calcWidth = activeLayer.bounds[2] - activeLayer.bounds[0], // Get layer's width
	calcHeight = activeLayer.bounds[3] - activeLayer.bounds[1]; // Get layer's height

	// Resize assets
	newHeight = Math.floor(calcHeight * scaleFactors[size][scale]);
	newWidth = Math.floor(calcWidth * scaleFactors[size][scale]);

	// Resize temp document using Bicubic Interpolation
	resizeLayer(newWidth);

	// Merge all layers inside the temp document
	//activeLayer2.merge();
}

// document.resizeImage doesn't seem to support scalestyles so we're using this workaround from http://ps-scripts.com/bb/viewtopic.php?p=14359
function resizeLayer(newWidth) {
	var idImgS = charIDToTypeID("ImgS");
	var desc2 = new ActionDescriptor();
	var idWdth = charIDToTypeID("Wdth");
	var idPxl = charIDToTypeID("#Pxl");
	desc2.putUnitDouble(idWdth, idPxl, newWidth);
	var idscaleStyles = stringIDToTypeID("scaleStyles");
	desc2.putBoolean(idscaleStyles, true);
	var idCnsP = charIDToTypeID("CnsP");
	desc2.putBoolean(idCnsP, true);
	var idIntr = charIDToTypeID("Intr");
	var idIntp = charIDToTypeID("Intp");
	var idBcbc = charIDToTypeID("Bcbc");
	desc2.putEnumerated(idIntr, idIntp, idBcbc);
	executeAction(idImgS, desc2, DialogModes.NO);
}

function dupToNewFile(_activeLayer, includeInvisibleObject) {
	if (includeInvisibleObject) {
		var fileName = _activeLayer.name.replace(/\.[^\.]+$/, ''),
		calcWidth = Math.ceil(_activeLayer.bounds[2] - _activeLayer.bounds[0]),
		calcHeight = Math.ceil(_activeLayer.bounds[3] - _activeLayer.bounds[1]),
		docResolution = docRef.resolution,
		document = app.documents.add(calcWidth, calcHeight, docResolution, fileName, NewDocumentMode.RGB,
				DocumentFill.TRANSPARENT);

		app.activeDocument = docRef;

		// Duplicated selection to a temp document
		_activeLayer.duplicate(document, ElementPlacement.INSIDE);
	} else {
		var fileName = _activeLayer.name.replace(/\.[^\.]+$/, ''),
		_tempLayer = _activeLayer.duplicate().merge(), // duplicate and merge layer to get actual visible bounds
		calcWidth = Math.ceil(_tempLayer.bounds[2] - _tempLayer.bounds[0]),
		calcHeight = Math.ceil(_tempLayer.bounds[3] - _tempLayer.bounds[1]),
		docResolution = docRef.resolution,
		document = app.documents.add(calcWidth, calcHeight, docResolution, fileName, NewDocumentMode.RGB,
				DocumentFill.TRANSPARENT);

		app.activeDocument = docRef;

		// Duplicated selection to a temp document
		_tempLayer.duplicate(document, ElementPlacement.INSIDE);
		_tempLayer.remove();
	}

	// Set focus on temp document
	app.activeDocument = document;

	// Assign a variable to the layer we pasted inside the temp document
	activeLayer2 = document.activeLayer;

	// Rasterize All Layers to remove warning when center the layer
	if (includeInvisibleObject)
		app.activeDocument.rasterizeAllLayers();

	// Center the layer
	activeLayer2.translate(-activeLayer2.bounds[0], -activeLayer2.bounds[1]);
}

function saveFunc(_activeLayer, _directory, _filename) {
	dupToNewFile(_activeLayer, false);
	var docRef2 = app.activeDocument;

	var Name = docRef2.name.replace(/\.[^\.]+$/, ''),
	Ext = decodeURI(docRef2.name).replace(/^.*\./, ''),
	Path = docRef.path,
	folder = Folder(Path + '/' + docName + '-assets/');

	if (!folder.exists) {
		folder.create();
	}

	for (dpi in scaleFactors[size]) {
		resizeDoc(docRef2, dpi);

		// Name the new asset
		var saveFile = File(folder + "/" + Name + (dpi === '@1x' ? '' : dpi) + ".png");
		var i = 0;
		while (saveFile.exists) {
			i++;
			saveFile = File(folder + "/" + Name + (dpi === '@1x' ? '' : dpi) + "_" + i + ".png");
		}

		var sfwOptions = new ExportOptionsSaveForWeb();
		sfwOptions.format = SaveDocumentType.PNG;
		sfwOptions.includeProfile = false;
		sfwOptions.interlaced = 0;
		sfwOptions.optimized = true;
		sfwOptions.quality = 100;
		sfwOptions.PNG8 = false;

		// Export the layer as a PNG
		activeDocument.exportDocument(saveFile, ExportType.SAVEFORWEB, sfwOptions);

		// History back 1 level (before resize)
		docRef2.activeHistoryState = docRef2.historyStates[docRef2.historyStates.length - 1];
	}

	// Close the document without saving
	activeDocument.close(SaveOptions.DONOTSAVECHANGES);
}