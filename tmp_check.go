package main
import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
)
func main() {
	envFile, _ := ioutil.ReadFile("backend/.env")
	token := ""
	for _, line := range strings.Split(string(envFile), "\n") {
		if strings.HasPrefix(line, "VK_OFFICIAL_GROUP_TOKEN=") {
			token = strings.TrimPrefix(line, "VK_OFFICIAL_GROUP_TOKEN=")
			break
		}
	}
	
	// Create VK script to check multiple users
	script := `
		var users = [82361623, 121703273, 165434330];
		var res = [];
		var i = 0;
		while (i < users.length) {
			res.push(API.messages.isMessagesFromGroupAllowed({group_id: 165434330, user_id: users[i]}));
			i = i + 1;
		}
		return res;
	`
	
	apiURL := "https://api.vk.com/method/execute"
	data := url.Values{}
	data.Set("code", script)
	data.Set("access_token", strings.TrimSpace(token))
	data.Set("v", "5.131")
	
	resp, _ := http.PostForm(apiURL, data)
	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Println(string(body))
}
