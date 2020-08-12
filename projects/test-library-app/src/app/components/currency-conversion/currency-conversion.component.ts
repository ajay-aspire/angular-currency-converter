import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { CurrencyConversionService } from 'angular-currency-converter';
import { NgbDateStruct, NgbCalendar } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-currency-conversion',
  templateUrl: './currency-conversion.component.html',
  styleUrls: ['./currency-conversion.component.css'],
})
export class CurrencyConversionComponent implements OnInit {
  model: NgbDateStruct;
  myForm: FormGroup;
  public amount: number;
  public baseCurrencyRate: string; // base currencies rate
  public baseCurrencyCode: string; // base currency code
  public convertedRates: any = []; // store converted
  public currencyRates: any = [];  // store data from currency rates
  public apisSource: any;          // apis source for source currencies rates dropdown
  public disabled: boolean;        // disable calender icon
  public selectedSource: string;   // selected source
  public selectedBase: string;
  public selectedTarget: string;
  public submitted: boolean;       // handle form submit
  public apisDetails: any;         // api configurations
  public host: any;                // host api
  public isVisible: boolean;       // table visibility
  public dateError: boolean;       // show date error

  constructor(private currencyConversionService: CurrencyConversionService, private calendar: NgbCalendar) {
  }

  ngOnInit() {

    this.isVisible = false;
    this.disabled = true;
    this.dateError = false;
    this.currencyRates = [];

    /* Make form value blank */
    this.myForm = new FormGroup({
      amount: new FormControl('', Validators.required),
      targetSource: new FormControl('', Validators.required),
      countryRates: new FormControl('', Validators.required),
      targetRates: new FormControl('', Validators.required),
      datePicker: new FormControl({value: undefined, disabled: true})
    });

    /* Get apisConfigurations */
    this.apisDetails = this.currencyConversionService.getApisConfigurations();
    this.host = this.apisDetails.host;
    this.apisSource = this.apisDetails.currencyRateSource;


    /* Get latest currencies rate [ default base: USD ] */
    this.currencyConversionService.getCurrencyRates(`${this.host}/latest?base=USD`).subscribe(data => {
      if (data) {
        for (const key of Object.keys(data.rates)) {
          if (data.rates.hasOwnProperty(key)) {
            const currencyInfo = {
              currencyCode: key,
              rate: data.rates[key],
              defaultBase: data.base
            };
            this.currencyRates.push(currencyInfo);
          }
        }
        this.sortCurrencyCode(this.currencyRates);
      }
    }, error => {
      console.log('Error', error);
    });
  }

  /* On source change  */
  async onSourceChange(event) {
    this.dateError = false;
    this.selectedSource = event.target.options[event.target.options.selectedIndex].text;
    if (this.selectedSource === 'History') { // On select history user have to apply date
      this.myForm.controls.datePicker.enable();
      this.disabled = false;
    } else {
      /* Get latest currencies rate by selection of latest option [ default base: USD ] */
      this.myForm.controls.datePicker.setValue(undefined);
      this.myForm.controls.datePicker.disable();
      this.disabled = true;
      // this.currencyRates = [];
      this.currencyConversionService.getCurrencyRates(`${this.host}/latest?base=USD`).subscribe(data => {
        if (data) {
          // tslint:disable-next-line:prefer-for-of
          for (let index = 0; index < this.currencyRates.length; index++) {
            const element = this.currencyRates[index];
            for (const key of Object.entries(data.rates)) {
              if (this.currencyRates[index].currencyCode === key[0]) {
                this.currencyRates[index].rate = key[1];
              }
            }
          }
          this.sortCurrencyCode(this.currencyRates);
        }
      }, error => {
        console.log('Error', error);
      });

    }
  }

  onBaseCurrencyChange(event) {
    this.selectedBase = '';
    this.selectedBase = event.target.options[event.target.options.selectedIndex].text;
  }

  onTargetCurrencyChange(event) {
    this.selectedTarget = '';
    this.selectedTarget = event.target.options[event.target.options.selectedIndex].text;
  }

  /* On date change get currencies rate of specified date  */
  async onDateChange(model) {
    this.dateError = false;
    // if (model !== undefined) {
      // Display error on selection of today & future dates [date picker]

    const getToday = this.calendar.getToday();
    const todayDate = Date.parse(`${getToday.year}-${getToday.month}-${getToday.day}`);
    const date = `${model.year}-${model.month}-${model.day}`;
    const selectedDate = Date.parse(date);
    this.validateDate(selectedDate, todayDate);


    // this.currencyRates = [];
      // Get currency rate history of selected date
    const url = `${this.host}/${date}?base=USD`;
    this.currencyConversionService.getCurrencyRates(url).subscribe(data => {
        if (data) {
          // tslint:disable-next-line:prefer-for-of
          for (let index = 0; index < this.currencyRates.length; index++) {
            const element = this.currencyRates[index];
            for (const key of Object.entries(data.rates)) {
              if (this.currencyRates[index].currencyCode === key[0]) {
                this.currencyRates[index].rate = key[1];
              }
            }
          }
          this.sortCurrencyCode(this.currencyRates);

        }
      }, error => {
        console.log('Error', error);
      });
    // }
  }

 /* Date validation */

  validateDate(selectedDate, todayDate) {
    if (selectedDate >= todayDate) {
      this.dateError = true;
      return;
    }
  }

  /* Validation of form field & return error */
  isFieldValid(field: string) {
    return (
      this.myForm.get(field).errors && this.myForm.get(field).touched ||
      this.myForm.get(field).untouched &&
      this.submitted && this.myForm.get(field).errors
    );
  }

  /* Get submitted form values */
  async onSubmit(form: FormGroup) {
    this.submitted = true;
    this.convertedRates = [];
    if (this.myForm.invalid && (form.value.datePicker === undefined)) {
      this.isVisible = false;
      if (form.value.targetSource.value === 'history') {
        this.dateError = true;
      } else {
        this.dateError = false;
      }
      return;
    } else {
      this.isVisible = true;
      if (form.value.targetSource.value === 'history' && form.value.datePicker === undefined) {
        this.dateError = true;
        this.isVisible = false;
        return;
      }
      const amount = form.value.amount;
      const baseCurrencyRate = form.value.countryRates.rate;
      const baseCurrencyCode = this.selectedBase;
      const targetCurrencyRate = form.value.targetRates.rate;
      const targetCurrencyCode = this.selectedTarget;
      // tslint:disable-next-line:max-line-length
      this.convertedRates = await this.currencyConversionService.convertCurrency(amount, baseCurrencyRate, baseCurrencyCode, targetCurrencyRate, targetCurrencyCode);
      this.submitted = false;
    }
  }

  sortCurrencyCode(data) {
    data.sort((a, b) => {
      if (a.currencyCode < b.currencyCode) { return -1; }
      if (a.currencyCode > b.currencyCode) { return 1; }
      return 0;
  });
  }

  /* Reset form after submit values */
  resetForm() {
    this.selectedBase = undefined;
    this.selectedTarget = undefined;
    this.isVisible = false;
    this.submitted = false;
    this.myForm = new FormGroup({
      amount: new FormControl('', Validators.required),
      targetSource: new FormControl('', Validators.required),
      countryRates: new FormControl('', Validators.required),
      targetRates: new FormControl('', Validators.required),
      datePicker: new FormControl({value: undefined, disabled: true})
    });
  }
}
