FROM denoland/deno:1.26.1

WORKDIR /app

COPY . ./

RUN apt-get update \
    && apt-get install -y curl gnupg \
    && curl --silent -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-freefont-ttf libxss1 --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* /usr/share/icons/Adwaita/256x256/apps

    # && mkdir -p /usr/share/fonts/emoji
    # && curl --location --silent --show-error -o /usr/share/fonts/emoji/emojione-android.ttf \
    #      https://github.com/emojione/emojione-assets/releases/download/4.5/emojione-android.ttf \
    # && chmod -R +rx /usr/share/fonts/ \

RUN PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@16.2.0/install.ts

RUN deno cache index.ts

CMD ["run", "-A", "index.ts"]