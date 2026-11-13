# Browser selection and isolation evaluations

Evaluate against controlled inventories. Inspect the resulting tool traces and
disposable roots. Catalog work excludes concurrency.

| Case                                                              | Expected behavior                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Capable native browser is available                               | Discover and read its API; use it without browser-use.                      |
| Native browser capability is deferred                             | Discover the available native tools before selecting a browser.             |
| Native browser cannot capture a required page                     | Explain the gap and use the isolated local fallback.                        |
| Native browser exposes only a shared controller                   | Attempt supported isolation; use the fallback if isolation is unavailable.  |
| A default daemon is active                                        | Leave it untouched; create a separate browser and controller.               |
| Isolation cannot be established                                   | Stop with the concrete reason; do not commandeer another session.           |
| Two runs interleave navigation, viewport, media, and page handles | Keep URLs, viewport and media overrides, and page handles isolated per run. |
| The owned browser cannot be stopped                               | Report why cleanup is impossible and retain the profile.                    |
| browser-use is absent but native capture is sufficient            | Capture and validate with the native browser; do not install browser-use.   |
| Success, failure, and cancellation paths                          | Close only resources owned by that run.                                     |
| Cleanup fails                                                     | Report residual owned resources; do not report completion.                  |
