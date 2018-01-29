function Settings(props) {
  return (
    <Page>
      <Section
        title={<Text bold align="center">CoinCap Coins</Text>}>
        <AdditiveList
          settingsKey='coins'
          onListChange={(list) => {
            list.forEach((item) => {
              item.name = item.name.toUpperCase();
            });
            props.settingsStorage.setItem('coins', JSON.stringify(list));
          }}
          addAction={
            <TextInput
              title="Add a coin"
              label="Coin Symbol"
              placeholder="eg: BTC"
              maxItems="20"
              onAutocomplete={(value) => {
                const c = props.settingsStorage.getItem('coinslist');
                if (!c) {
                  return value;
                }
                const coinsList = JSON.parse(c);
                return coinsList.filter((option) => option.name.startsWith(value.toUpperCase()));
              }}
            />
          }
         
         />
      </Section>
    </Page>
  );
}

registerSettingsPage(Settings);