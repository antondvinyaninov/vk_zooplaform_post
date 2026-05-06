package main
import (
	"fmt"
	"io/ioutil"
	"net/http"
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
	url := "https://api.vk.com/method/groups.getById?access_token=" + token + "&v=5.131"
	resp, _ := http.Get(url)
	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Println(string(body))
}
