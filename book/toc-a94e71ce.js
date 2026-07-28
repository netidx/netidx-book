// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="quick_start.html"><strong aria-hidden="true">1.</strong> Quick Start</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="overview.html"><strong aria-hidden="true">2.</strong> Overview</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/overview.html"><strong aria-hidden="true">3.</strong> Administration</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/admin.html"><strong aria-hidden="true">3.1.</strong> The netidx admin Tool</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/security.html"><strong aria-hidden="true">3.2.</strong> Admin-Plane Security</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/backup_recovery.html"><strong aria-hidden="true">3.3.</strong> Backup and Restore</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/configuration.html"><strong aria-hidden="true">3.4.</strong> Configuration</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/tls.html"><strong aria-hidden="true">3.5.</strong> Managing TLS</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/id_map.html"><strong aria-hidden="true">3.6.</strong> Id-Map Daemon</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/authorization.html"><strong aria-hidden="true">3.7.</strong> Authorization</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/startup.html"><strong aria-hidden="true">3.8.</strong> Running the Resolver Server</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/listener_check.html"><strong aria-hidden="true">3.9.</strong> Listener Check</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/subscription_flow.html"><strong aria-hidden="true">3.10.</strong> Subscription Flow</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="administration/fault_tolerance.html"><strong aria-hidden="true">3.11.</strong> Fault Tolerance</a></span></li></ol><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/overview.html"><strong aria-hidden="true">4.</strong> Command Line Tools</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/publisher.html"><strong aria-hidden="true">4.1.</strong> publisher</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/subscriber.html"><strong aria-hidden="true">4.2.</strong> subscriber</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/resolver.html"><strong aria-hidden="true">4.3.</strong> resolver</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/recorder.html"><strong aria-hidden="true">4.4.</strong> recorder</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/container.html"><strong aria-hidden="true">4.5.</strong> container</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/activation.html"><strong aria-hidden="true">4.6.</strong> activation</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="tools/stress.html"><strong aria-hidden="true">4.7.</strong> stress</a></span></li></ol><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="examples/overview.html"><strong aria-hidden="true">5.</strong> Examples</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="examples/vmstat.html"><strong aria-hidden="true">5.1.</strong> Publishing vmstat</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="examples/integration.html"><strong aria-hidden="true">5.2.</strong> Publishing from Rust</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="examples/complete_system.html"><strong aria-hidden="true">5.3.</strong> Off-Grid Solar Control</a></span></li></ol><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="protocols/overview.html"><strong aria-hidden="true">6.</strong> Protocols Built on Netidx</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="protocols/rpc.html"><strong aria-hidden="true">6.1.</strong> Remote Procedure Call</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="protocols/clustering.html"><strong aria-hidden="true">6.2.</strong> Clustering</a></span></li></ol><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/overview.html"><strong aria-hidden="true">7.</strong> GTK Browser</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/views.html"><strong aria-hidden="true">7.1.</strong> GUI Builder</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/scripting.html"><strong aria-hidden="true">7.2.</strong> BScript</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/widgets.html"><strong aria-hidden="true">7.3.</strong> Widgets</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/frame.html"><strong aria-hidden="true">7.3.1.</strong> Frame</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/box.html"><strong aria-hidden="true">7.3.2.</strong> Box</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/grid.html"><strong aria-hidden="true">7.3.3.</strong> Grid</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/paned.html"><strong aria-hidden="true">7.3.4.</strong> Paned</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/notebook.html"><strong aria-hidden="true">7.3.5.</strong> Notebook</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/table.html"><strong aria-hidden="true">7.3.6.</strong> Table</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/image.html"><strong aria-hidden="true">7.3.7.</strong> Image</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/label.html"><strong aria-hidden="true">7.3.8.</strong> Label</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/button.html"><strong aria-hidden="true">7.3.9.</strong> Button</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/link_button.html"><strong aria-hidden="true">7.3.10.</strong> Link Button</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/switch.html"><strong aria-hidden="true">7.3.11.</strong> Switch</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/toggle_button.html"><strong aria-hidden="true">7.3.12.</strong> Toggle Button</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/check_button.html"><strong aria-hidden="true">7.3.13.</strong> Check Button</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/combo_box.html"><strong aria-hidden="true">7.3.14.</strong> Combo Box</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/radio_button.html"><strong aria-hidden="true">7.3.15.</strong> Radio Button</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/entry.html"><strong aria-hidden="true">7.3.16.</strong> Entry</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/search_entry.html"><strong aria-hidden="true">7.3.17.</strong> Search Entry</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/scale.html"><strong aria-hidden="true">7.3.18.</strong> Scale</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/progress_bar.html"><strong aria-hidden="true">7.3.19.</strong> Progress Bar</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="browser/line_plot.html"><strong aria-hidden="true">7.3.20.</strong> Line Plot</a></span></li></ol><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/browser.html"><strong aria-hidden="true">7.4.</strong> Browser Specific Functions</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/browser/confirm.html"><strong aria-hidden="true">7.4.1.</strong> confirm</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/browser/current_path.html"><strong aria-hidden="true">7.4.2.</strong> current_path</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/browser/event.html"><strong aria-hidden="true">7.4.3.</strong> event</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/browser/navigate.html"><strong aria-hidden="true">7.4.4.</strong> navigate</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/browser/poll.html"><strong aria-hidden="true">7.4.5.</strong> poll</a></span></li></ol><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn.html"><strong aria-hidden="true">7.5.</strong> Standard Functions</a></span><ol class="section"><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/after_idle.html"><strong aria-hidden="true">7.5.1.</strong> after_idle</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/all.html"><strong aria-hidden="true">7.5.2.</strong> all</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/and.html"><strong aria-hidden="true">7.5.3.</strong> and</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/any.html"><strong aria-hidden="true">7.5.4.</strong> any</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/array.html"><strong aria-hidden="true">7.5.5.</strong> array</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/basename.html"><strong aria-hidden="true">7.5.6.</strong> basename</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/call.html"><strong aria-hidden="true">7.5.7.</strong> call</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/cast.html"><strong aria-hidden="true">7.5.8.</strong> cast</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/cmp.html"><strong aria-hidden="true">7.5.9.</strong> cmp</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/contains.html"><strong aria-hidden="true">7.5.10.</strong> contains</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/count.html"><strong aria-hidden="true">7.5.11.</strong> count</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/divide.html"><strong aria-hidden="true">7.5.12.</strong> divide</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/do.html"><strong aria-hidden="true">7.5.13.</strong> do</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/ends_with.html"><strong aria-hidden="true">7.5.14.</strong> ends_with</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/eval.html"><strong aria-hidden="true">7.5.15.</strong> eval</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/filter_err.html"><strong aria-hidden="true">7.5.16.</strong> filter_err</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/filter.html"><strong aria-hidden="true">7.5.17.</strong> filter</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/get.html"><strong aria-hidden="true">7.5.18.</strong> get</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/if.html"><strong aria-hidden="true">7.5.19.</strong> if</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/index.html"><strong aria-hidden="true">7.5.20.</strong> index</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/isa.html"><strong aria-hidden="true">7.5.21.</strong> isa</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/is_error.html"><strong aria-hidden="true">7.5.22.</strong> is_error</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/load.html"><strong aria-hidden="true">7.5.23.</strong> load</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/max.html"><strong aria-hidden="true">7.5.24.</strong> max</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/mean.html"><strong aria-hidden="true">7.5.25.</strong> mean</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/min.html"><strong aria-hidden="true">7.5.26.</strong> min</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/not.html"><strong aria-hidden="true">7.5.27.</strong> not</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/once.html"><strong aria-hidden="true">7.5.28.</strong> once</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/or.html"><strong aria-hidden="true">7.5.29.</strong> or</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/product.html"><strong aria-hidden="true">7.5.30.</strong> product</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/replace.html"><strong aria-hidden="true">7.5.31.</strong> replace</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/sample.html"><strong aria-hidden="true">7.5.32.</strong> sample</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/set.html"><strong aria-hidden="true">7.5.33.</strong> set</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/starts_with.html"><strong aria-hidden="true">7.5.34.</strong> starts_with</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/store.html"><strong aria-hidden="true">7.5.35.</strong> store</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/let.html"><strong aria-hidden="true">7.5.36.</strong> let</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/string_concat.html"><strong aria-hidden="true">7.5.37.</strong> string_concat</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/string_join.html"><strong aria-hidden="true">7.5.38.</strong> string_join</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/strip_prefix.html"><strong aria-hidden="true">7.5.39.</strong> strip_prefix</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/strip_suffix.html"><strong aria-hidden="true">7.5.40.</strong> strip_suffix</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/sum.html"><strong aria-hidden="true">7.5.41.</strong> sum</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/timer.html"><strong aria-hidden="true">7.5.42.</strong> timer</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/trim_end.html"><strong aria-hidden="true">7.5.43.</strong> trim_end</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/trim.html"><strong aria-hidden="true">7.5.44.</strong> trim</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/trim_start.html"><strong aria-hidden="true">7.5.45.</strong> trim_start</a></span></li><li class="chapter-item expanded "><span class="chapter-link-wrapper"><a href="bscript/stdfn/uniq.html"><strong aria-hidden="true">7.5.46.</strong> uniq</a></span></li></ol></li></ol></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split('#')[0].split('?')[0];
        if (current_page.endsWith('/')) {
            current_page += 'index.html';
        }
        const links = Array.prototype.slice.call(this.querySelectorAll('a'));
        const l = links.length;
        for (let i = 0; i < l; ++i) {
            const link = links[i];
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The 'index' page is supposed to alias the first chapter in the book.
            // Check both with and without the '.html' suffix to be robust against pretty URLs
            if (link.href.replace(/\.html$/, '') === current_page.replace(/\.html$/, '')
                || i === 0
                && path_to_root === ''
                && current_page.endsWith('/index.html')) {
                link.classList.add('active');
                let parent = link.parentElement;
                while (parent) {
                    if (parent.tagName === 'LI' && parent.classList.contains('chapter-item')) {
                        parent.classList.add('expanded');
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', e => {
            if (e.target.tagName === 'A') {
                const clientRect = e.target.getBoundingClientRect();
                const sidebarRect = this.getBoundingClientRect();
                sessionStorage.setItem('sidebar-scroll-offset', clientRect.top - sidebarRect.top);
            }
        }, { passive: true });
        const sidebarScrollOffset = sessionStorage.getItem('sidebar-scroll-offset');
        sessionStorage.removeItem('sidebar-scroll-offset');
        if (sidebarScrollOffset !== null) {
            // preserve sidebar scroll position when navigating via links within sidebar
            const activeSection = this.querySelector('.active');
            if (activeSection) {
                const clientRect = activeSection.getBoundingClientRect();
                const sidebarRect = this.getBoundingClientRect();
                const currentOffset = clientRect.top - sidebarRect.top;
                this.scrollTop += currentOffset - parseFloat(sidebarScrollOffset);
            }
        } else {
            // scroll sidebar to current active section when navigating via
            // 'next/previous chapter' buttons
            const activeSection = document.querySelector('#mdbook-sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        const sidebarAnchorToggles = document.querySelectorAll('.chapter-fold-toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(el => {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define('mdbook-sidebar-scrollbox', MDBookSidebarScrollbox);


// ---------------------------------------------------------------------------
// Support for dynamically adding headers to the sidebar.

(function() {
    // This is used to detect which direction the page has scrolled since the
    // last scroll event.
    let lastKnownScrollPosition = 0;
    // This is the threshold in px from the top of the screen where it will
    // consider a header the "current" header when scrolling down.
    const defaultDownThreshold = 150;
    // Same as defaultDownThreshold, except when scrolling up.
    const defaultUpThreshold = 300;
    // The threshold is a virtual horizontal line on the screen where it
    // considers the "current" header to be above the line. The threshold is
    // modified dynamically to handle headers that are near the bottom of the
    // screen, and to slightly offset the behavior when scrolling up vs down.
    let threshold = defaultDownThreshold;
    // This is used to disable updates while scrolling. This is needed when
    // clicking the header in the sidebar, which triggers a scroll event. It
    // is somewhat finicky to detect when the scroll has finished, so this
    // uses a relatively dumb system of disabling scroll updates for a short
    // time after the click.
    let disableScroll = false;
    // Array of header elements on the page.
    let headers;
    // Array of li elements that are initially collapsed headers in the sidebar.
    // I'm not sure why eslint seems to have a false positive here.
    // eslint-disable-next-line prefer-const
    let headerToggles = [];
    // This is a debugging tool for the threshold which you can enable in the console.
    let thresholdDebug = false;

    // Updates the threshold based on the scroll position.
    function updateThreshold() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // The number of pixels below the viewport, at most documentHeight.
        // This is used to push the threshold down to the bottom of the page
        // as the user scrolls towards the bottom.
        const pixelsBelow = Math.max(0, documentHeight - (scrollTop + windowHeight));
        // The number of pixels above the viewport, at least defaultDownThreshold.
        // Similar to pixelsBelow, this is used to push the threshold back towards
        // the top when reaching the top of the page.
        const pixelsAbove = Math.max(0, defaultDownThreshold - scrollTop);
        // How much the threshold should be offset once it gets close to the
        // bottom of the page.
        const bottomAdd = Math.max(0, windowHeight - pixelsBelow - defaultDownThreshold);
        let adjustedBottomAdd = bottomAdd;

        // Adjusts bottomAdd for a small document. The calculation above
        // assumes the document is at least twice the windowheight in size. If
        // it is less than that, then bottomAdd needs to be shrunk
        // proportional to the difference in size.
        if (documentHeight < windowHeight * 2) {
            const maxPixelsBelow = documentHeight - windowHeight;
            const t = 1 - pixelsBelow / Math.max(1, maxPixelsBelow);
            const clamp = Math.max(0, Math.min(1, t));
            adjustedBottomAdd *= clamp;
        }

        let scrollingDown = true;
        if (scrollTop < lastKnownScrollPosition) {
            scrollingDown = false;
        }

        if (scrollingDown) {
            // When scrolling down, move the threshold up towards the default
            // downwards threshold position. If near the bottom of the page,
            // adjustedBottomAdd will offset the threshold towards the bottom
            // of the page.
            const amountScrolledDown = scrollTop - lastKnownScrollPosition;
            const adjustedDefault = defaultDownThreshold + adjustedBottomAdd;
            threshold = Math.max(adjustedDefault, threshold - amountScrolledDown);
        } else {
            // When scrolling up, move the threshold down towards the default
            // upwards threshold position. If near the bottom of the page,
            // quickly transition the threshold back up where it normally
            // belongs.
            const amountScrolledUp = lastKnownScrollPosition - scrollTop;
            const adjustedDefault = defaultUpThreshold - pixelsAbove
                + Math.max(0, adjustedBottomAdd - defaultDownThreshold);
            threshold = Math.min(adjustedDefault, threshold + amountScrolledUp);
        }

        if (documentHeight <= windowHeight) {
            threshold = 0;
        }

        if (thresholdDebug) {
            const id = 'mdbook-threshold-debug-data';
            let data = document.getElementById(id);
            if (data === null) {
                data = document.createElement('div');
                data.id = id;
                data.style.cssText = `
                    position: fixed;
                    top: 50px;
                    right: 10px;
                    background-color: 0xeeeeee;
                    z-index: 9999;
                    pointer-events: none;
                `;
                document.body.appendChild(data);
            }
            data.innerHTML = `
                <table>
                  <tr><td>documentHeight</td><td>${documentHeight.toFixed(1)}</td></tr>
                  <tr><td>windowHeight</td><td>${windowHeight.toFixed(1)}</td></tr>
                  <tr><td>scrollTop</td><td>${scrollTop.toFixed(1)}</td></tr>
                  <tr><td>pixelsAbove</td><td>${pixelsAbove.toFixed(1)}</td></tr>
                  <tr><td>pixelsBelow</td><td>${pixelsBelow.toFixed(1)}</td></tr>
                  <tr><td>bottomAdd</td><td>${bottomAdd.toFixed(1)}</td></tr>
                  <tr><td>adjustedBottomAdd</td><td>${adjustedBottomAdd.toFixed(1)}</td></tr>
                  <tr><td>scrollingDown</td><td>${scrollingDown}</td></tr>
                  <tr><td>threshold</td><td>${threshold.toFixed(1)}</td></tr>
                </table>
            `;
            drawDebugLine();
        }

        lastKnownScrollPosition = scrollTop;
    }

    function drawDebugLine() {
        if (!document.body) {
            return;
        }
        const id = 'mdbook-threshold-debug-line';
        const existingLine = document.getElementById(id);
        if (existingLine) {
            existingLine.remove();
        }
        const line = document.createElement('div');
        line.id = id;
        line.style.cssText = `
            position: fixed;
            top: ${threshold}px;
            left: 0;
            width: 100vw;
            height: 2px;
            background-color: red;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(line);
    }

    function mdbookEnableThresholdDebug() {
        thresholdDebug = true;
        updateThreshold();
        drawDebugLine();
    }

    window.mdbookEnableThresholdDebug = mdbookEnableThresholdDebug;

    // Updates which headers in the sidebar should be expanded. If the current
    // header is inside a collapsed group, then it, and all its parents should
    // be expanded.
    function updateHeaderExpanded(currentA) {
        // Add expanded to all header-item li ancestors.
        let current = currentA.parentElement;
        while (current) {
            if (current.tagName === 'LI' && current.classList.contains('header-item')) {
                current.classList.add('expanded');
            }
            current = current.parentElement;
        }
    }

    // Updates which header is marked as the "current" header in the sidebar.
    // This is done with a virtual Y threshold, where headers at or below
    // that line will be considered the current one.
    function updateCurrentHeader() {
        if (!headers || !headers.length) {
            return;
        }

        // Reset the classes, which will be rebuilt below.
        const els = document.getElementsByClassName('current-header');
        for (const el of els) {
            el.classList.remove('current-header');
        }
        for (const toggle of headerToggles) {
            toggle.classList.remove('expanded');
        }

        // Find the last header that is above the threshold.
        let lastHeader = null;
        for (const header of headers) {
            const rect = header.getBoundingClientRect();
            if (rect.top <= threshold) {
                lastHeader = header;
            } else {
                break;
            }
        }
        if (lastHeader === null) {
            lastHeader = headers[0];
            const rect = lastHeader.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.top >= windowHeight) {
                return;
            }
        }

        // Get the anchor in the summary.
        const href = '#' + lastHeader.id;
        const a = [...document.querySelectorAll('.header-in-summary')]
            .find(element => element.getAttribute('href') === href);
        if (!a) {
            return;
        }

        a.classList.add('current-header');

        updateHeaderExpanded(a);
    }

    // Updates which header is "current" based on the threshold line.
    function reloadCurrentHeader() {
        if (disableScroll) {
            return;
        }
        updateThreshold();
        updateCurrentHeader();
    }


    // When clicking on a header in the sidebar, this adjusts the threshold so
    // that it is located next to the header. This is so that header becomes
    // "current".
    function headerThresholdClick(event) {
        // See disableScroll description why this is done.
        disableScroll = true;
        setTimeout(() => {
            disableScroll = false;
        }, 100);
        // requestAnimationFrame is used to delay the update of the "current"
        // header until after the scroll is done, and the header is in the new
        // position.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Closest is needed because if it has child elements like <code>.
                const a = event.target.closest('a');
                const href = a.getAttribute('href');
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    threshold = targetElement.getBoundingClientRect().bottom;
                    updateCurrentHeader();
                }
            });
        });
    }

    // Takes the nodes from the given head and copies them over to the
    // destination, along with some filtering.
    function filterHeader(source, dest) {
        const clone = source.cloneNode(true);
        clone.querySelectorAll('mark').forEach(mark => {
            mark.replaceWith(...mark.childNodes);
        });
        dest.append(...clone.childNodes);
    }

    // Scans page for headers and adds them to the sidebar.
    document.addEventListener('DOMContentLoaded', function() {
        const activeSection = document.querySelector('#mdbook-sidebar .active');
        if (activeSection === null) {
            return;
        }

        const main = document.getElementsByTagName('main')[0];
        headers = Array.from(main.querySelectorAll('h2, h3, h4, h5, h6'))
            .filter(h => h.id !== '' && h.children.length && h.children[0].tagName === 'A');

        if (headers.length === 0) {
            return;
        }

        // Build a tree of headers in the sidebar.

        const stack = [];

        const firstLevel = parseInt(headers[0].tagName.charAt(1));
        for (let i = 1; i < firstLevel; i++) {
            const ol = document.createElement('ol');
            ol.classList.add('section');
            if (stack.length > 0) {
                stack[stack.length - 1].ol.appendChild(ol);
            }
            stack.push({level: i + 1, ol: ol});
        }

        // The level where it will start folding deeply nested headers.
        const foldLevel = 3;

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const level = parseInt(header.tagName.charAt(1));

            const currentLevel = stack[stack.length - 1].level;
            if (level > currentLevel) {
                // Begin nesting to this level.
                for (let nextLevel = currentLevel + 1; nextLevel <= level; nextLevel++) {
                    const ol = document.createElement('ol');
                    ol.classList.add('section');
                    const last = stack[stack.length - 1];
                    const lastChild = last.ol.lastChild;
                    // Handle the case where jumping more than one nesting
                    // level, which doesn't have a list item to place this new
                    // list inside of.
                    if (lastChild) {
                        lastChild.appendChild(ol);
                    } else {
                        last.ol.appendChild(ol);
                    }
                    stack.push({level: nextLevel, ol: ol});
                }
            } else if (level < currentLevel) {
                while (stack.length > 1 && stack[stack.length - 1].level > level) {
                    stack.pop();
                }
            }

            const li = document.createElement('li');
            li.classList.add('header-item');
            li.classList.add('expanded');
            if (level < foldLevel) {
                li.classList.add('expanded');
            }
            const span = document.createElement('span');
            span.classList.add('chapter-link-wrapper');
            const a = document.createElement('a');
            span.appendChild(a);
            a.href = '#' + header.id;
            a.classList.add('header-in-summary');
            filterHeader(header.children[0], a);
            a.addEventListener('click', headerThresholdClick);
            const nextHeader = headers[i + 1];
            if (nextHeader !== undefined) {
                const nextLevel = parseInt(nextHeader.tagName.charAt(1));
                if (nextLevel > level && level >= foldLevel) {
                    const toggle = document.createElement('a');
                    toggle.classList.add('chapter-fold-toggle');
                    toggle.classList.add('header-toggle');
                    toggle.addEventListener('click', () => {
                        li.classList.toggle('expanded');
                    });
                    const toggleDiv = document.createElement('div');
                    toggleDiv.textContent = '❱';
                    toggle.appendChild(toggleDiv);
                    span.appendChild(toggle);
                    headerToggles.push(li);
                }
            }
            li.appendChild(span);

            const currentParent = stack[stack.length - 1];
            currentParent.ol.appendChild(li);
        }

        const onThisPage = document.createElement('div');
        onThisPage.classList.add('on-this-page');
        onThisPage.append(stack[0].ol);
        const activeItemSpan = activeSection.parentElement;
        activeItemSpan.after(onThisPage);
    });

    document.addEventListener('DOMContentLoaded', reloadCurrentHeader);
    document.addEventListener('scroll', reloadCurrentHeader, { passive: true });
})();

