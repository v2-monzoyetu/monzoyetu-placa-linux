class cookies{
    getCookie(name: string) : string | undefined {
        let cookieName = undefined
        document.cookie.split(';').forEach(function(element) {
          const [k, v] = element.split('=');
          if(k.trim() == name){
            cookieName = v
          }
        })
        return cookieName
    }

    setCookie(name: string, value: string, days: number) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
}

export default cookies