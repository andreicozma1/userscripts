'use strict';
// ==UserScript==
// @name         Obsidian Omnisearch in Google
// @namespace    https://github.com/andreicozma1/userscripts
// @downloadURL  https://github.com/andreicozma1/userscripts/raw/master/dist/obsidian-omnisearch-google.user.js
// @updateURL    https://github.com/andreicozma1/userscripts/raw/master/dist/obsidian-omnisearch-google.user.js
// @version      0.3.3
// @description  Injects Obsidian notes in Google search results (based on scambier/userscripts)
// @author       Andrei Cozma
// @match        https://google.com/*
// @match        https://www.google.com/*
// @icon         https://obsidian.md/favicon.ico
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/sizzlemctwizzle/GM_config/master/gm_config.js
// @require      https://gist.githubusercontent.com/scambier/109932d45b7592d3decf24194008be4d/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==
/* globals GM_config, jQuery, $, waitForKeyElements */
(function () {
	'use strict';
	// Google's right "sidebar" that will contain the results div
	const sidebarSelector = '#rhs';
	// The results div
	const resultsDivId = 'OmnisearchObsidianResults';
	// The "loading"/"no results" label
	const loadingSpanId = 'OmnisearchObsidianLoading';
	// The `new GM_config()` syntax is not recognized by the TS compiler
	// @ts-ignore
	const gmc = new GM_config({
		id: 'ObsidianOmnisearchGoogle',
		title: 'Omnisearch in Google - Configuration',
		fields: {
			port: {
				label: 'HTTP Port',
				type: 'text',
				default: '51361',
			},
			nbResults: {
				label: 'Number of results to display',
				type: 'int',
				default: 10,
			},
		},
		events: {
			save: () => {
				location.reload();
			},
			init: () => {},
		},
	});
	// Promise resolves when initialization completes
	const onInit = (config) =>
		new Promise((resolve) => {
			let isInit = () =>
				setTimeout(() => (config.isInit ? resolve() : isInit()), 0);
			isInit();
		});
	// Obsidian logo
	const logo = `<svg height="1em" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 256 256">
<style>
.purple { fill: #9974F8; }
@media (prefers-color-scheme: dark) { .purple { fill: #A88BFA; } }
</style>
<path class="purple" d="M94.82 149.44c6.53-1.94 17.13-4.9 29.26-5.71a102.97 102.97 0 0 1-7.64-48.84c1.63-16.51 7.54-30.38 13.25-42.1l3.47-7.14 4.48-9.18c2.35-5 4.08-9.38 4.9-13.56.81-4.07.81-7.64-.2-11.11-1.03-3.47-3.07-7.14-7.15-11.21a17.02 17.02 0 0 0-15.8 3.77l-52.81 47.5a17.12 17.12 0 0 0-5.5 10.2l-4.5 30.18a149.26 149.26 0 0 1 38.24 57.2ZM54.45 106l-1.02 3.06-27.94 62.2a17.33 17.33 0 0 0 3.27 18.96l43.94 45.16a88.7 88.7 0 0 0 8.97-88.5A139.47 139.47 0 0 0 54.45 106Z"/><path class="purple" d="m82.9 240.79 2.34.2c8.26.2 22.33 1.02 33.64 3.06 9.28 1.73 27.73 6.83 42.82 11.21 11.52 3.47 23.45-5.8 25.08-17.73 1.23-8.67 3.57-18.46 7.75-27.53a94.81 94.81 0 0 0-25.9-40.99 56.48 56.48 0 0 0-29.56-13.35 96.55 96.55 0 0 0-40.99 4.79 98.89 98.89 0 0 1-15.29 80.34h.1Z"/><path class="purple" d="M201.87 197.76a574.87 574.87 0 0 0 19.78-31.6 8.67 8.67 0 0 0-.61-9.48 185.58 185.58 0 0 1-21.82-35.9c-5.91-14.16-6.73-36.08-6.83-46.69 0-4.07-1.22-8.05-3.77-11.21l-34.16-43.33c0 1.94-.4 3.87-.81 5.81a76.42 76.42 0 0 1-5.71 15.9l-4.7 9.8-3.36 6.72a111.95 111.95 0 0 0-12.03 38.23 93.9 93.9 0 0 0 8.67 47.92 67.9 67.9 0 0 1 39.56 16.52 99.4 99.4 0 0 1 25.8 37.31Z"/></svg>
`;

	const cssStyle = `
#OmnisearchObsidianResults {
	box-shadow: none;
	background: #fff;
	border: 1px solid #dadce0;
	border-radius: 8px;
}

.omnisearch-header {
	font-size: 18px;
    line-height: 24px;
    color: #202124;
	padding: 12px 16px;
}

.omnisearch-result {
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
    position: relative;
}

.omnisearch-result:last-child {
    border-bottom: none;
}

.omnisearch-title {
    font-size: 16px;
    font-weight: normal;
	font-family: Google Sans,Roboto,arial,sans-serif;
    margin: 0;
    display: block; /* Ensure it's block level for correct line breaks */
}

.omnisearch-excerpt {
    color: #4d5156;
    font-family: Google Sans,Roboto,arial,sans-serif;
    font-size: 14px;
    line-height: 22px;
    /* max-height: 2.8em; */
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.omnisearch-result.expanded .omnisearch-excerpt {
	-webkit-line-clamp: unset;
}

.expand-arrow {
    cursor: pointer;
    position: absolute;
    right: 16px;
    top: 8px; /* Keeps the arrow at the top */
    transition: transform 0.3s ease-in-out;
}

.expand-arrow svg {
    height: 24px;
    width: 24px;
}

.omnisearch-result.expanded .expand-arrow svg {
    transform: translateY(-50%) rotate(180deg);
	margin-top: 12px;
}

.score-indicator {
  height: 10px;
  width: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
}

.match-highlight {
  font-weight: bold;
}
`;

	// Add the CSS to the document head
	const styleElement = document.createElement('style');
	styleElement.type = 'text/css';
	styleElement.textContent = cssStyle;
	document.head.appendChild(styleElement);

	function omnisearch() {
		const port = gmc.get('port');
		const nbResults = gmc.get('nbResults');
		const params = new URLSearchParams(window.location.search);
		const query = params.get('q');
		if (!query) return;

		injectLoadingLabel();

		GM.xmlHttpRequest({
			method: 'GET',
			url: `http://localhost:${port}/search?q=${query}`,
			headers: {
				'Content-Type': 'application/json',
			},
			onload: function (res) {
				const data = JSON.parse(res.response);

				console.log('Omnisearch results', data);

				removeLoadingLabel(data.length > 0);
				data.splice(nbResults);

				const maxScore = Math.max(...data.map((item) => item.score));

				// Empty the div and add a title for the results
				const resultsDiv = $(`#${resultsDivId}`);
				resultsDiv.empty();

				resultsDiv.append(
					'<div class="omnisearch-header">Omnisearch results</div>'
				);

				function getScoreColor(score, maxScore) {
					// Normalize the score to a 0-1 scale
					const normalizedScore = score / maxScore;
					// Convert normalized score to a color from green (high) to red (low)
					const red = Math.floor((1 - normalizedScore) * 255);
					const green = Math.floor(normalizedScore * 255);
					return `rgb(${red}, ${green}, 0)`;
				}

				// Iterate over the results to create the structured layout
				data.forEach((item) => {
					const url = `obsidian://open?vault=${encodeURIComponent(
						item.vault
					)}&file=${encodeURIComponent(item.path)}`;
					let excerpt = item.excerpt;

					const resultItem = $(`
					  <div class="omnisearch-result">
						<div class="score-indicator" style="background-color: ${getScoreColor(
							item.score,
							maxScore
						)};"></div>
						<a href="${url}" class="omnisearch-title">${item.basename}</a>
						<div class="omnisearch-excerpt">${excerpt}</div>
						<div class="expand-arrow">
						  <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
							<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path>
						  </svg>
						</div>
					  </div>
					`);

					resultItem.on('click', function () {
						$(this).toggleClass('expanded');
					});

					resultsDiv.append(resultItem);
				});
			},
			onerror: function (res) {
				console.error('Omnisearch error', res);
				const span = $('#' + loadingSpanId)[0];
				if (span) {
					span.innerHTML = `Error: Obsidian is not running or the Omnisearch server is not enabled.
							<br /><a href="Obsidian://open">Open Obsidian</a>.`;
				}
			},
		});
	}

	function injectTitle() {
		const id = 'OmnisearchObsidianConfig';
		if (!$('#' + id)[0]) {
			const btn = $(`<div style="margin-bottom: 1em">
          <span style="font-size: 18px">${logo}&nbspOmnisearch results</span>
          <span style="font-size: 12px">(<a id=${id} class="feedback-link-btn" title="Settings" href="#">settings</a>)</span>
        </div>`);
			$(`#${resultsDivId}`).append(btn);
			$(document).on('click', '#' + id, function () {
				gmc.open();
			});
		}
	}
	function injectResultsContainer() {
		const resultsDiv = $(
			`<div id="${resultsDivId}" style="margin-bottom: 2em;"></div>`
		);
		$(sidebarSelector).prepend(resultsDiv);
	}
	function injectLoadingLabel() {
		if (!$('#' + loadingSpanId)[0]) {
			const label = $(`<span id=${loadingSpanId}>Loading...</span>`);
			$(`#${resultsDivId}`).append(label);
		}
	}
	function removeLoadingLabel(foundResults = true) {
		if (foundResults) {
			$('#' + loadingSpanId).remove();
		} else {
			$('#' + loadingSpanId).text('No results found');
		}
	}
	console.log('Loading Omnisearch injector');
	let init = onInit(gmc);
	init.then(() => {
		// Make sure the results container is there
		if (!$(sidebarSelector)[0]) {
			$('#rcnt').append('<div id="rhs"></div>');
		}
		injectResultsContainer();
		injectTitle();
		omnisearch(); // Make an initial call, just to avoid an improbable race condition
		console.log('Loaded Omnisearch injector');
		// Keep the results on top
		waitForKeyElements(sidebarSelector, () => {
			$(resultsDivId).prependTo(sidebarSelector);
		});
	});
})();
